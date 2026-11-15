import { afterEach, expect, it, vi } from 'vitest'
import { roomLoop } from './room-loop'

afterEach(() => vi.unstubAllGlobals())

it('suspends covered/hidden rooms and resumes without a long time jump or duplicate callbacks', () => {
  const doc = Object.assign(new EventTarget(), { hidden: false })
  const frames = new Map<number, FrameRequestCallback>()
  let id = 0
  let now = 100
  vi.stubGlobal('document', doc)
  vi.stubGlobal('performance', { now: () => now })
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++id, cb); return id })
  vi.stubGlobal('cancelAnimationFrame', (n: number) => frames.delete(n))
  const draw = vi.fn()
  const loop = roomLoop(draw)
  const tick = (ms: number) => {
    now += ms
    const entry = frames.entries().next().value!
    frames.delete(entry[0])
    entry[1](now)
  }
  expect(frames.size).toBe(1)
  tick(16)
  expect(draw).toHaveBeenLastCalledWith(116, 0.016)
  loop.setActive(false)
  expect(frames.size).toBe(0)
  now += 20_000
  loop.setActive(true)
  loop.setActive(true)
  expect(frames.size).toBe(1)
  tick(16)
  expect(draw).toHaveBeenLastCalledWith(20_132, 0.016)
  doc.hidden = true
  doc.dispatchEvent(new Event('visibilitychange'))
  expect(frames.size).toBe(0)
  now += 10_000
  doc.hidden = false
  doc.dispatchEvent(new Event('visibilitychange'))
  tick(16)
  expect(draw).toHaveBeenLastCalledWith(30_148, 0.016)
  loop.dispose()
  expect(frames.size).toBe(0)
  doc.dispatchEvent(new Event('visibilitychange'))
  expect(frames.size).toBe(0)
})
