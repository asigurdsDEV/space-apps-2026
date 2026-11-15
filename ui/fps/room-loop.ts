/** Stop covered/background rooms entirely; restart with a fresh clock so returning never jumps. */
export function roomLoop(draw: (now: number, dt: number) => void) {
  let active = true
  let disposed = false
  let frame = 0
  let last = performance.now()
  const schedule = () => {
    if (!frame && active && !disposed && !document.hidden) frame = requestAnimationFrame(tick)
  }
  function tick(now: number) {
    frame = 0
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    draw(now, dt)
    schedule()
  }
  const restart = () => {
    cancelAnimationFrame(frame)
    frame = 0
    last = performance.now()
    schedule()
  }
  document.addEventListener('visibilitychange', restart)
  schedule()
  return {
    setActive(on: boolean) { active = on; restart() },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', restart)
    },
  }
}
