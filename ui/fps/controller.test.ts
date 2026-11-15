import { afterEach, expect, it, vi } from 'vitest'
import { PerspectiveCamera } from 'three'
import { createFps } from './controller'

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
  expect(camera.position.z).toBeCloseTo(-0.32)
  key('Escape')
  expect(fps.update(0.1)).toBe(true) // draw the final frame that settles the walking bob
  expect(camera.position.z).toBeCloseTo(-0.32)
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
  expect(camera.position.z).toBeCloseTo(-0.32)
  event(el, 'pointerdown', { pointerType: 'mouse', pointerId: 1, clientX: 0, clientY: 0 })
  event(win, 'pointercancel', {})
  event(win, 'pointermove', { pointerId: 1, clientX: 100, clientY: 0 })
  fps.update(0.1)
  expect(camera.rotation.y).toBe(0)
  fps.dispose()
  key('KeyW'); fps.update(0.1)
  expect(camera.position.z).toBeCloseTo(-0.32)
})
