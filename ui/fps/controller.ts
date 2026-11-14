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
  dispose(): void
}

const MOUSE = 0.0022
const KEY_TURN = 1.9 // radians per second with the arrow keys
const BOB = 0.035

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

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
  let walked = 0
  let touch = { forward: 0, right: 0 }
  let pendingLook: [number, number] = [0, 0]
  let dirty = true
  const keys = new Set<string>()
  /** Pressed since the last frame: a quick tap still moves or turns for one frame. */
  const tapped = new Set<string>()

  camera.rotation.order = 'YXZ'

  const look = (dx: number, dy: number) => {
    yaw -= dx * MOUSE
    pitch = clampPitch(pitch - dy * MOUSE)
    dirty = true
  }

  const interact = () => {
    if (!enabled || !aimed || aimed.disabled || options.blocked?.(aimed)) return
    aimed.use()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!enabled || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
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
  }
  const onVisibility = () => document.hidden && release()

  // Mouse look: pointer lock where the browser allows it, else drag to look.
  let drag: { id: number; x: number; y: number } | null = null
  const onClick = () => {
    if (!enabled) return
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
    if (!drag || drag.id !== e.pointerId) return
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


  return {
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
        yaw += turn[0] * KEY_TURN * dt
        pitch = clampPitch(pitch + turn[1] * KEY_TURN * 0.6 * dt)
        changed = true
      }
      if (pendingLook[0] || pendingLook[1]) {
        look(...pendingLook)
        pendingLook = [0, 0]
        changed = true
      }
      const move = { forward: Math.max(-1, Math.min(1, axis(0) + touch.forward)), right: Math.max(-1, Math.min(1, axis(1) + touch.right)) }
      const run = down.has('ShiftLeft') || down.has('ShiftRight')
      const next = step(pos, yaw, move, dt, run ? RUN_MS : WALK_MS, obstacles)
      const moved = Math.hypot(next[0] - pos[0], next[2] - pos[2])
      if (moved > 0) {
        pos = next
        walked += moved
        changed = true
      }
      const bob = options.reducedMotion || moved === 0 ? 0 : BOB * Math.abs(Math.sin(walked * 2.4))
      camera.position.set(pos[0], EYE + bob, pos[2])
      camera.rotation.set(pitch, yaw, 0)

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
      yaw = y
      pitch = clampPitch(pt)
      dirty = true
    },
    setMove(forward, right) {
      touch = { forward, right }
    },
    addLook(dx, dy) {
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
      if (locked) document.exitPointerLock?.()
    },
  }
}
