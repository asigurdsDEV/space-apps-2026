// The first-person controller (decision 007): keyboard + mouse (pointer lock) + touch hooks drive a
// three.js camera through a place's obstacles, and E uses the Interactable in front of you.
// The place owns its scene and render loop: it calls `update(dt)` every frame it draws.

import type { PerspectiveCamera } from 'three'
import { aimAt, clampPitch, EYE, lookDir, RUN_MS, step, WALK_MS, type Interactable, type Obstacle, type Vec3 } from './model'

export interface FpsOptions {
  /** Where the player stands (feet on the floor; y is ignored) and which way they face. */
  start: Vec3
  yaw?: number
  reducedMotion?: boolean
  /** The thing in front of the player changed (undefined: nothing). */
  onAim?: (it: Interactable | undefined) => void
  /** Mouse look turned on or off (pointer lock). */
  onLock?: (locked: boolean) => void
  /** Why this player may not use it (e.g. another role holds it), or undefined if they may. */
  blocked?: (it: Interactable) => string | undefined
}

export interface Fps {
  /** Move and aim for one frame. True while the view is changing, so the place keeps drawing. */
  update(dt: number): boolean
  /** What the place offers now. Call again whenever it changes. */
  setPlace(items: readonly Interactable[], obstacles: readonly Obstacle[]): void
  teleport(pos: Vec3, yaw?: number, pitch?: number): void
  /** Touch / other input: a thumb pad (-1..1 each) and a look drag (pixels). */
  setMove(forward: number, right: number): void
  addLook(dx: number, dy: number): void
  /** Use the thing in front of the player (E, click while looking, the touch E button). */
  interact(): void
  /** Off during cutscenes and pop-outs: drops held keys and mouse look. */
  setEnabled(on: boolean): void
  readonly aimed: Interactable | undefined
  /** Feet on the floor, and which way they face (the same yaw as the camera). */
  feet(): { x: number; z: number; yaw: number }
  dispose(): void
}

/** The controller of the room on screen (one at a time), for the touch pads in FpsPrompt. */
let current: Fps | null = null
export const currentFps = () => current

const MOUSE = 0.0022
const KEY_TURN = 1.9 // radians per second with the arrow keys
/** Seconds for the walking head motion to ease in when you set off and out when you stop. */
const SETTLE = 0.16
/** How fast walk speed and head bob catch the keys. Shorter feels snappier; this is a short glide, not a slide. */
const GLIDE = 0.11
/** Mouse and arrow look follow a few frames behind the input so a jumpy frame does not jerk the view. */
const LOOK = 0.04

const damp = (current: number, target: number, dt: number, tau: number) =>
  current + (target - current) * (1 - Math.exp(-dt / tau))

/**
 * How the eye moves while walking, as real heads do: up and down once per step, side to side over two
 * steps (the weight shifting from foot to foot), with a slight lean into each step and a small nod.
 * `phase` advances by π per step; `amp` is 0 standing, 1 walking, a little more running.
 * Metres and radians: about 5 cm of bob and half a degree of lean at a walk. Less than that is not noticed
 * on a screen (a real eye steadies itself; a camera has to show the step); more starts to feel like a shaking camera.
 */
export function headMotion(phase: number, amp: number): { y: number; sway: number; roll: number; nod: number } {
  const stride = Math.sin(phase)
  return {
    y: 0.052 * amp * (stride * stride - 0.5),
    sway: 0.028 * amp * stride,
    roll: -0.008 * amp * stride,
    nod: 0.0055 * amp * Math.sin(2 * phase + 0.6),
  }
}

/** Metres per step at a given speed: longer strides when running, so the cadence rises gently (about 2.4 → 3 steps a second), not in proportion. */
const strideAt = (speed: number) => Math.max(1, Math.min(2.1, 1.3 + (speed - WALK_MS) * 0.25))

const usingUi = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || !!t.closest('button, a, input, textarea, select, [role="dialog"], dialog'))

/** Keys that walk or turn, by `code` (layout-independent: WASD stays where it is on AZERTY). */
const MOVE_KEYS: Record<string, [number, number]> = { KeyW: [1, 0], KeyS: [-1, 0], KeyA: [0, -1], KeyD: [0, 1] }
const TURN_KEYS: Record<string, [number, number]> = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }

export function createFps(element: HTMLElement, camera: PerspectiveCamera, options: FpsOptions): Fps {
  let pos: Vec3 = [options.start[0], EYE, options.start[2]]
  let yaw = options.yaw ?? 0
  let pitch = 0
  let items: readonly Interactable[] = []
  let obstacles: readonly Obstacle[] = []
  let aimed: Interactable | undefined
  let enabled = true
  let locked = false
  let phase = 0
  let head = headMotion(0, 0)
  let velF = 0
  let velR = 0
  let speedNow = WALK_MS
  let bobAmp = 0
  let yawTo = yaw
  let pitchTo = 0
  let touch = { forward: 0, right: 0 }
  let pendingLook: [number, number] = [0, 0]
  let dirty = true
  const keys = new Set<string>()
  /** Pressed since the last frame: a quick tap still moves or turns for one frame. */
  const tapped = new Set<string>()

  camera.rotation.order = 'YXZ'

  const look = (dx: number, dy: number) => {
    yawTo -= dx * MOUSE
    pitchTo = clampPitch(pitchTo - dy * MOUSE)
    dirty = true
  }

  const interact = () => {
    if (!enabled || !aimed || aimed.disabled || options.blocked?.(aimed)) return
    aimed.use()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape') { release(); return }
    if (!enabled || usingUi(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.code === 'KeyE' || (e.code === 'Enter' && locked)) {
      if (!e.repeat) interact()
    } else if (!(e.code in MOVE_KEYS) && !(e.code in TURN_KEYS) && !e.code.startsWith('Shift')) return
    keys.add(e.code)
    tapped.add(e.code)
    e.preventDefault() // arrows and space would scroll the page
  }
  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code)
  }
  const release = () => {
    keys.clear()
    tapped.clear()
    touch = { forward: 0, right: 0 }
    pendingLook = [0, 0]
    velF = 0
    velR = 0
    speedNow = WALK_MS
    bobAmp = 0
    drag = null
  }
  const onVisibility = () => document.hidden && release()

  // Mouse look: pointer lock where the browser allows it, else drag to look.
  let drag: { id: number; x: number; y: number } | null = null
  const onClick = () => {
    if (!enabled) return
    element.parentElement?.focus()
    if (locked) return interact()
    const lock = element.requestPointerLock?.() as Promise<void> | undefined
    lock?.catch?.(() => {}) // refused (iframe, too soon after Esc): drag to look still works
  }
  const onLockChange = () => {
    locked = document.pointerLockElement === element
    if (!locked) release()
    options.onLock?.(locked)
  }
  const onMouseMove = (e: MouseEvent) => {
    if (locked && enabled) look(e.movementX, e.movementY)
  }
  const onPointerDown = (e: PointerEvent) => {
    if (!locked && enabled && e.pointerType === 'mouse') drag = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!enabled || !drag || drag.id !== e.pointerId) return
    look(e.clientX - drag.x, e.clientY - drag.y)
    drag = { ...drag, x: e.clientX, y: e.clientY }
  }
  const onPointerUp = () => {
    drag = null
  }

  addEventListener('keydown', onKeyDown)
  addEventListener('keyup', onKeyUp)
  addEventListener('blur', release)
  document.addEventListener('visibilitychange', onVisibility)
  document.addEventListener('pointerlockchange', onLockChange)
  document.addEventListener('mousemove', onMouseMove)
  element.addEventListener('click', onClick)
  element.addEventListener('pointerdown', onPointerDown)
  addEventListener('pointermove', onPointerMove)
  addEventListener('pointerup', onPointerUp)
  addEventListener('pointercancel', onPointerUp)


  const api: Fps = {
    update(rawDt) {
      if (!enabled) return false
      const dt = Math.min(rawDt, 0.1) // a stutter or a background tab must not spin the view or teleport the player
      let changed = dirty
      dirty = false
      const down = new Set([...keys, ...tapped])
      tapped.clear()
      const axis = (i: 0 | 1) => [...down].reduce((sum, k) => sum + (MOVE_KEYS[k]?.[i] ?? 0), 0)
      const turn = [...down].reduce<[number, number]>((t, k) => [t[0] + (TURN_KEYS[k]?.[0] ?? 0), t[1] + (TURN_KEYS[k]?.[1] ?? 0)], [0, 0])
      if (turn[0] || turn[1]) {
        yawTo += turn[0] * KEY_TURN * dt
        pitchTo = clampPitch(pitchTo + turn[1] * KEY_TURN * 0.6 * dt)
        changed = true
      }
      if (pendingLook[0] || pendingLook[1]) {
        look(...pendingLook)
        pendingLook = [0, 0]
        changed = true
      }
      yaw = damp(yaw, yawTo, dt, LOOK)
      pitch = damp(pitch, pitchTo, dt, LOOK)
      if (Math.abs(yaw - yawTo) < 0.0004 && Math.abs(pitch - pitchTo) < 0.0004) {
        yaw = yawTo
        pitch = pitchTo
      } else changed = true
      const wishF = Math.max(-1, Math.min(1, axis(0) + touch.forward))
      const wishR = Math.max(-1, Math.min(1, axis(1) + touch.right))
      const wishLen = Math.hypot(wishF, wishR)
      const scale = wishLen > 1 ? 1 / wishLen : 1
      velF = damp(velF, wishF * scale, dt, GLIDE)
      velR = damp(velR, wishR * scale, dt, GLIDE)
      if (wishF === 0 && Math.abs(velF) < 0.02) velF = 0
      if (wishR === 0 && Math.abs(velR) < 0.02) velR = 0
      const run = down.has('ShiftLeft') || down.has('ShiftRight')
      speedNow = damp(speedNow, run ? RUN_MS : WALK_MS, dt, GLIDE)
      const next = step(pos, yaw, { forward: velF, right: velR }, dt, speedNow, obstacles)
      const moved = Math.hypot(next[0] - pos[0], next[2] - pos[2])
      // The speed actually covered, so walking into a wall does not bob on the spot.
      const speed = dt > 0 ? moved / dt : 0
      if (moved > 0.0001) {
        pos = next
        phase += (Math.PI * moved) / strideAt(speed)
        changed = true
      }
      bobAmp = options.reducedMotion ? 0 : damp(bobAmp, Math.min(1.3, speed / WALK_MS), dt, SETTLE)
      if (moved <= 0.0001 && bobAmp < 0.03) bobAmp = 0
      const was = head
      head = headMotion(phase, bobAmp)
      if (head.y !== was.y || head.sway !== was.sway || Math.abs(camera.position.y - (EYE + head.y)) > 0.0001) changed = true
      // Only the camera moves: `pos`, the aim ray and feet() stay on the walked line.
      camera.position.set(pos[0] + Math.cos(yaw) * head.sway, EYE + head.y, pos[2] - Math.sin(yaw) * head.sway)
      camera.rotation.set(pitch + head.nod, yaw, head.roll)

      const now = aimAt([pos[0], EYE, pos[2]], lookDir(yaw, pitch), items)
      if (now !== aimed) {
        aimed = now
        options.onAim?.(now)
      }
      return changed
    },
    setPlace(nextItems, nextObstacles) {
      items = nextItems
      obstacles = nextObstacles
      // Same id after a rebuild = same thing: keep it aimed without a flicker.
      if (aimed) {
        const same = items.find((it) => it.id === aimed!.id)
        if (same !== aimed) {
          aimed = same
          options.onAim?.(same)
        }
      }
      dirty = true
    },
    teleport(p, y = yaw, pt = 0) {
      pos = [p[0], EYE, p[2]]
      yaw = yawTo = y
      pitch = pitchTo = clampPitch(pt)
      velF = 0
      velR = 0
      bobAmp = 0
      dirty = true
    },
    setMove(forward, right) {
      if (!enabled) return
      touch = { forward, right }
    },
    addLook(dx, dy) {
      if (!enabled) return
      pendingLook = [pendingLook[0] + dx, pendingLook[1] + dy]
    },
    interact,
    setEnabled(on) {
      enabled = on
      if (!on) {
        release()
        if (locked) document.exitPointerLock?.()
      }
      dirty = true
    },
    get aimed() {
      return aimed
    },
    feet() {
      return { x: pos[0], z: pos[2], yaw }
    },
    dispose() {
      removeEventListener('keydown', onKeyDown)
      removeEventListener('keyup', onKeyUp)
      removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      element.removeEventListener('click', onClick)
      element.removeEventListener('pointerdown', onPointerDown)
      removeEventListener('pointermove', onPointerMove)
      removeEventListener('pointerup', onPointerUp)
      removeEventListener('pointercancel', onPointerUp)
      if (locked) document.exitPointerLock?.()
      if (current === api) current = null
    },
  }
  current = api
  // Dev builds only: QA can read and move the player from the console (`__fps.where()`, `__fps.teleport([x, 0, z], yaw)`).
  if (import.meta.env.DEV) Object.assign(window, { __fps: { ...api, get aimed() { return aimed }, where: () => ({ pos, yaw, pitch, head }) } })
  return api
}
