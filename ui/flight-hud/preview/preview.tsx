// Dev-only preview of the V2 HUD with claude@jamie's real V4 route. No 3D: "Fly to" stands in for the
// scene (V7, claude@ethan). Hold Space or the Scan button to scan; the result comes from the real interact().
// Open http://localhost:5173/ui/flight-hud/preview/preview.html. ?parts=camera-basic,thermal-imager picks instruments.

import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { interact, routeComplete, trainingRoute } from '../../../data/pilot-training'
import { FlightHud, type FlightHudProps, type HudFocus, type Results } from '../index'

const parts = (new URLSearchParams(location.search).get('parts') ?? 'camera-basic').split(',')

function Preview() {
  const [results, setResults] = useState<Results>({})
  const [focus, setFocus] = useState<HudFocus | null>(null)
  const [message, setMessage] = useState<FlightHudProps['message']>(null)
  const holding = useRef(false)

  // Approach: 1,200 km out, in range a second later.
  const flyTo = (id: string) => {
    setFocus({ id, distance_m: 1_200_000, inRange: false, held_s: 0 })
    setTimeout(() => setFocus((f) => (f && f.id === id ? { ...f, distance_m: 40_000, inRange: true } : f)), 1000)
  }

  useEffect(() => {
    const tick = setInterval(() => {
      setFocus((f) => {
        if (!f || !f.inRange) return f
        if (!holding.current) return f.held_s ? { ...f, held_s: 0 } : f
        const t = trainingRoute.targets.find((x) => x.id === f.id)!
        const held = f.held_s + 0.1
        if (held < t.hold_s) return { ...f, held_s: held }
        holding.current = false
        const done = Object.keys(results)
        const r = interact(f.id, done, parts)
        if (r) {
          setMessage({ ...r, id: f.id })
          if (r.outcome !== 'blocked') setResults((prev) => ({ ...prev, [f.id]: r.outcome as 'done' | 'partial' }))
        }
        return { ...f, held_s: 0 }
      })
    }, 100)
    const down = (e: KeyboardEvent) => e.code === 'Space' && ((holding.current = true), e.preventDefault())
    const up = (e: KeyboardEvent) => e.code === 'Space' && (holding.current = false)
    const release = () => (holding.current = false) // controls never stick after blur (plan: V1/V7 rule)
    addEventListener('keydown', down)
    addEventListener('keyup', up)
    addEventListener('blur', release)
    return () => {
      clearInterval(tick)
      removeEventListener('keydown', down)
      removeEventListener('keyup', up)
      removeEventListener('blur', release)
    }
  }, [results])

  const doneIds = Object.keys(results)
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'grid', gap: 6, zIndex: 1 }}>
        {trainingRoute.targets.map((t) => (
          <button key={t.id} onClick={() => flyTo(t.id)}>
            Fly to {t.label}
          </button>
        ))}
        <button onClick={() => (setResults({}), setFocus(null), setMessage(null))}>Reset</button>
      </div>
      <FlightHud
        objective={trainingRoute.intro}
        targets={trainingRoute.targets}
        results={results}
        focus={focus}
        message={message}
        completeText={routeComplete(doneIds) ? trainingRoute.complete_text : null}
        onScanStart={() => (holding.current = true)}
        onScanEnd={() => (holding.current = false)}
        onRecenter={() => setFocus(null)}
        onPause={() => alert('Paused (V7 decides what pause does)')}
        onExit={() => alert('Exit (V7 decides where this goes)')}
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
