// Dev-only preview: `npm run dev`, then open /ui/scene3d/flight/preview.html. Not part of the build.
// The whole training loop with the real V1 input, V2 HUD and V4 route: click the scene (or the flight pad), fly with
// W/S, turn with A/D, climb with R/F, and hold E on a target in range.
// ?scenario=moon or mars picks the mission's craft and planet; ?instruments=camera-basic,ir-spectrometer picks the instruments.
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getDatasets, getScenario } from '../../../data'
import { interact, routeComplete, trainingRoute } from '../../../data/pilot-training'
import { simCore } from '../../../sim'
import { FlightHud, type FlightHudProps, type HudFocus, type Results } from '../../flight-hud'
import { PilotInput, type PilotIntent } from '../../pilot-input'
import '../../theme/theme.css'
import { FlightView } from './FlightView'

const query = new URLSearchParams(location.search)
const config = getScenario(query.get('scenario') ?? 'demo') ?? getScenario('demo')!
const initial = simCore.init(config, getDatasets(config.datasets))
const instruments = query.get('instruments')
const state = instruments ? { ...initial, params: { ...initial.params, instruments } } : initial
const parts = Object.values(state.params).flatMap((value) => (typeof value === 'string' ? value.split(',') : []))

/** Keyboard flying only works while V1's pad has the focus. */
const focusPad = () => document.querySelector<HTMLElement>('.pi-pad')?.focus({ preventScroll: true })

function Preview() {
  const [intent, setIntent] = useState<PilotIntent>({ forward: 0, right: 0, up: 0, brake: false, interact: false })
  const [scanHeld, setScanHeld] = useState(false)
  const [focus, setFocus] = useState<HudFocus | null>(null)
  const [results, setResults] = useState<Results>({})
  const [message, setMessage] = useState<FlightHudProps['message']>(null)
  const done = Object.keys(results)
  useEffect(focusPad, [])

  const onFocus = (next: HudFocus | null) => {
    setFocus(next)
    const target = trainingRoute.targets.find((t) => t.id === next?.id)
    if (!next || !target || next.held_s < target.hold_s) return
    setScanHeld(false)
    const result = interact(next.id, done, parts)
    if (!result) return
    setMessage({ ...result, id: next.id })
    const { outcome } = result
    if (outcome !== 'blocked') setResults((r) => ({ ...r, [next.id]: outcome }))
  }
  // The view only counts a hold on a target that is still to do, so "too early" is said on the press instead.
  const press = () => {
    const result = focus?.inRange ? interact(focus.id, done, parts) : null
    if (result?.outcome === 'blocked') setMessage({ ...result, id: focus!.id })
  }

  return (
    <main className="game-theme" data-theme="dark" style={{ minHeight: '100vh', padding: 12, display: 'grid', gap: 12, justifyItems: 'center' }}>
      <div style={{ position: 'relative', width: '100%' }} onClick={focusPad}>
        <FlightView state={state} intent={intent} scanning={scanHeld} targets={trainingRoute.targets} done={done} onFocus={onFocus} />
        <FlightHud
          objective={trainingRoute.intro}
          targets={trainingRoute.targets}
          results={results}
          focus={focus}
          message={message}
          completeText={routeComplete(done) ? trainingRoute.complete_text : null}
          onScanStart={() => setScanHeld(true)}
          onScanEnd={() => setScanHeld(false)}
          scanHeld={scanHeld}
        />
      </div>
      <PilotInput onIntent={setIntent} onInteract={press} />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
