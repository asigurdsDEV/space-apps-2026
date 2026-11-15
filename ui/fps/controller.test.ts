import { afterEach, expect, it, vi } from 'vitest'
import { PerspectiveCamera } from 'three'
import { createFps, headMotion } from './controller'

class Element extends EventTarget {
  isContentEditable = false
  parentElement = { focus() {} }
  constructor(readonly ui = false) { super() }
  closest() { return this.ui ? this : null }
}
afterEach(() => vi.unstubAllGlobals())

it('releases all input on Escape/disable, ignores UI keys and cancels a drag on pointercancel', () => {
  const win = new EventTarget()
  const doc = Object.assign(new EventTarget(), { hidden: false, pointerLockElement: null })
  vi.stubGlobal('window', win)
  vi.stubGlobal('HTMLElement', Element)
  vi.stubGlobal('document', doc)
  vi.stubGlobal('addEventListener', win.addEventListener.bind(win))
  vi.stubGlobal('removeEventListener', win.removeEventListener.bind(win))
  const el = new Element()
  const camera = new PerspectiveCamera()
  const fps = createFps(el as unknown as HTMLElement, camera, { start: [0, 0, 0] })
  const event = (target: EventTarget, type: string, props: object) => target.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), props))
  const key = (code: string) => event(win, 'keydown', { code })
  key('KeyW'); fps.update(0.1)
  const z1 = camera.position.z
  expect(z1).toBeLessThan(-0.08)
  expect(z1).toBeGreaterThan(-0.32) // speed eases in, so the first step is shorter than a full stride
  fps.update(0.1)
  const z2 = camera.position.z
  expect(z1 - z2).toBeGreaterThan(-z1) // the second step is longer: still speeding up
  key('Escape')
  expect(fps.update(0.1)).toBe(true) // draw the final frame that settles the walking bob
  expect(camera.position.z).toBeCloseTo(z2)
  // A focused menu/control must not rotate the room or trigger E.
  const button = new Element(true)
  const input = Object.assign(new Event('keydown'), { code: 'ArrowRight' })
  Object.defineProperty(input, 'target', { value: button })
  win.dispatchEvent(input)
  fps.update(0.1)
  expect(camera.rotation.y).toBe(0)
  fps.addLook(100, 0)
  fps.setMove(1, 0)
  fps.setEnabled(false)
  fps.addLook(100, 0)
  fps.setMove(1, 0)
  fps.setEnabled(true)
  fps.update(0.1)
  expect(camera.rotation.y).toBe(0)
  expect(camera.position.z).toBeCloseTo(z2)
  event(el, 'pointerdown', { pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0 })
  event(win, 'pointercancel', {})
  event(win, 'pointermove', { pointerId: 1, clientX: 100, clientY: 0 })
  fps.update(0.1)
  expect(camera.rotation.y).toBe(0)
  fps.dispose()
  key('KeyW'); fps.update(0.1)
  expect(camera.position.z).toBeCloseTo(z2)
})

it('walking moves the eye like a head: a bob per step, a sway over two steps, all small and gone when standing', () => {
  expect(headMotion(1.234, 0)).toEqual({ y: 0, sway: 0, roll: -0, nod: 0 })
  let top = { y: 0, sway: 0, roll: 0, nod: 0 }
  for (let phase = 0; phase < 2 * Math.PI; phase += 0.01) {
    const m = headMotion(phase, 1.3) // running: the strongest it gets
    const next = headMotion(phase + Math.PI, 1.3) // one step later
    expect(next.y).toBeCloseTo(m.y) // the same height at every step
    expect(next.sway).toBeCloseTo(-m.sway) // on the other foot
    expect(next.roll).toBeCloseTo(-m.roll)
    top = { y: Math.max(top.y, Math.abs(m.y)), sway: Math.max(top.sway, Math.abs(m.sway)), roll: Math.max(top.roll, Math.abs(m.roll)), nod: Math.max(top.nod, Math.abs(m.nod)) }
  }
  expect(top.y).toBeGreaterThan(0.01)
  expect(top.y).toBeLessThan(0.03) // centimetres
  expect(top.sway).toBeLessThan(0.03)
  expect(top.roll).toBeLessThan(0.0087) // under half a degree
  expect(top.nod).toBeLessThan(0.0087)
})

it('head motion follows the speed actually walked, leaves aim and feet alone, and is off under reduced motion', () => {
  const win = new EventTarget()
  vi.stubGlobal('window', win)
  vi.stubGlobal('HTMLElement', Element)
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false, pointerLockElement: null }))
  vi.stubGlobal('addEventListener', win.addEventListener.bind(win))
  vi.stubGlobal('removeEventListener', win.removeEventListener.bind(win))
  const walk = (reducedMotion: boolean) => {
    const camera = new PerspectiveCamera()
    const aims: (string | undefined)[] = []
    const fps = createFps(new Element() as unknown as HTMLElement, camera, { start: [0, 0, 0], reducedMotion, onAim: (it) => aims.push(it?.id) })
    fps.setPlace([{ id: 'target', at: [0, 1.7, -1.5], reach: 50, label: 'Target', use() {} }], []) // a target dead ahead
    win.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyD' }))
    let moved = 0
    for (let i = 0; i < 90; i++) {
      fps.update(1 / 60)
      moved = Math.max(moved, Math.abs(camera.position.y - 1.7), Math.abs(camera.rotation.z), Math.abs(camera.position.z - fps.feet().z))
    }
    const feet = fps.feet()
    fps.dispose()
    return { moved, aims, feet }
  }
  const free = walk(false)
  expect(free.moved).toBeGreaterThan(0.004)
  expect(free.feet.z).toBe(0) // strafing right: the feet stay on the line, only the eye sways
  const steady = walk(true)
  expect(steady.moved).toBe(0)
  // What you aim at, and where your feet end up, is the same with and without the head motion.
  expect(free.aims).toEqual(steady.aims)
  expect(free.feet).toEqual(steady.feet)
  const blocked = (() => {
    const camera = new PerspectiveCamera()
    const fps = createFps(new Element() as unknown as HTMLElement, camera, { start: [0, 0, 0] })
    fps.setPlace([], [{ min: [-5, 0, -0.5], max: [5, 3, -0.4] }])
    win.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyW' }))
    for (let i = 0; i < 90; i++) fps.update(1 / 60)
    const y = camera.position.y
    fps.dispose()
    return y
  })()
  expect(blocked).toBeCloseTo(1.7, 5) // pushing against a wall: no bobbing on the spot
})
