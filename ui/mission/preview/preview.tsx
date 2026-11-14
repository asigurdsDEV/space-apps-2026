// Dev-only preview of the mission screens, driven by the real sim and its test fixtures.
// Open http://localhost:5173/ui/mission/preview/preview.html with `npm run dev`.
// This is NOT the app loop (that's app/, owned by claude@ethan). It only exists so the
// mission screens can be checked before the app loop and real data land.
//
// Query string: ?seed=7 changes the random rolls, ?sandbox turns off random failures,
// ?weak flies a design with one ground station (loses data, so the debrief has fixes to show).
//
// The anomaly card is a STAND-IN until the sim emits `decision_required` (decision 004):
// it pops up on day 20 and the choice has no effect here. The what-if fixes ARE real:
// the same mission rerun with one change, the way sim/analysis.ts whatIf() will do it.

import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Command, ParamValue, SimEvent, SimState } from '../../../shared'
import { init, step, summary } from '../../../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../../../sim/testing/fixtures'
import type { Decision, WhatIfFix } from '../game'
import { MissionScreen } from '../index'

const query = new URLSearchParams(location.search)
const config = {
  ...demoConfig,
  seed: Number(query.get('seed') ?? demoConfig.seed),
  params: { ...demoConfig.params, random_failures: !query.has('sandbox') },
}
const design: Record<string, ParamValue> = query.has('weak') ? { ...goodDesign, ground_stations: 1 } : goodDesign
const DAY_S = 86400

const SAMPLE_CARD: Decision = {
  decision_id: 'preview-1',
  card_id: 'reaction-wheel',
  title: 'Reaction wheel failure',
  body: "One of the spinning wheels that points your spacecraft has stopped. You can't hold your instruments steady on targets.",
  console: 'spacecraft',
  options: [
    { id: 'a', label: 'Switch to coarse pointing', effect_text: 'Science −40% from now on. No risk.' },
    { id: 'b', label: 'Try to restart the wheel', effect_text: "Good chance it's fixed. If not, 5 days in safe mode." },
  ],
  story: {
    mission: 'Kepler',
    year: 2013,
    text: 'Kepler lost its second reaction wheel. Engineers balanced it with sunlight pressure and flew a new mission, K2.',
  },
}

function launched(params: Record<string, ParamValue>): { state: SimState; events: SimEvent[] } {
  let state = init(config, fixtureDatasets)
  const events: SimEvent[] = []
  const designCommands: Command[] = Object.entries(params).map(([key, value]) => ({
    type: 'set_param',
    payload: { key, value },
  }))
  for (const commands of [designCommands, [{ type: 'launch', payload: {} } as Command]]) {
    const result = step(state, commands, config.dt_s)
    state = result.state
    events.push(...result.events)
  }
  return { state, events }
}

function flyToEnd(params: Record<string, ParamValue>) {
  let { state } = launched(params)
  for (let i = 0; state.status !== 'ended' && i < 2000; i++) state = step(state, [], config.dt_s).state
  return summary(state)
}

/** Real what-if: rerun with each single change (other ground station counts, every other part per slot). */
function whatIf(params: Record<string, ParamValue>): WhatIfFix[] {
  const fixes: WhatIfFix[] = []
  const stations = Number(params.ground_stations ?? 1)
  for (let n = 1; n <= 6; n++) {
    if (n === stations) continue
    const next = { ...params, ground_stations: n }
    const s = flyToEnd(next)
    fixes.push({ change: `${n} ground station${n > 1 ? 's' : ''} instead of ${stations}`, score: Number(s.score), grade: String(s.grade), params: next })
  }
  const entities = init(config, fixtureDatasets).entities
  const slots: [string, string][] = [['launch_vehicle', 'launch_vehicle'], ['orbit', 'orbit'], ['bus', 'bus'], ['power_system', 'power_system'], ['comms_system', 'comms_system']]
  for (const [key, kind] of slots) {
    for (const part of entities.filter((e) => e.kind === kind && e.id !== params[key])) {
      const next = { ...params, [key]: part.id }
      const s = flyToEnd(next)
      fixes.push({ change: `the ${part.name}`, score: Number(s.score), grade: String(s.grade), params: next })
    }
  }
  return fixes
}

function Preview() {
  const [params, setParams] = useState(design)
  const [run, setRun] = useState(() => launched(design))
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [cardShown, setCardShown] = useState(false)
  const [fixes, setFixes] = useState<WhatIfFix[]>([])
  const runRef = useRef(run)
  runRef.current = run

  // 1x = one sim day per second. Stops while a card is open, like the sim will.
  useEffect(() => {
    if (paused || decision || run.state.status === 'ended') return
    const id = setInterval(() => {
      const { state, events } = step(runRef.current.state, [], config.dt_s)
      setRun({ state, events: [...runRef.current.events, ...events] })
      if (!cardShown && state.metrics.phase === 'operations' && state.t_s >= 20 * DAY_S) {
        setDecision(SAMPLE_CARD)
        setCardShown(true)
      }
    }, 1000 / speed)
    return () => clearInterval(id)
  }, [paused, speed, run.state.status, decision, cardShown])

  useEffect(() => {
    if (run.state.status === 'ended') setFixes(whatIf(params))
  }, [run.state.status, params])

  const restart = (next: Record<string, ParamValue>) => {
    setParams(next)
    setPaused(false)
    setDecision(null)
    setCardShown(false)
    setFixes([])
    setRun(launched(next))
  }

  const onCommand = (command: Command) => {
    if (command.type === 'pause') setPaused(true)
    else if (command.type === 'resume') setPaused(false)
    else if (command.type === 'set_speed') setSpeed(command.payload.multiplier)
    else if (command.type === 'reset') restart(params)
  }

  return (
    <MissionScreen
      state={run.state}
      events={run.events}
      onCommand={onCommand}
      paused={paused}
      speed={speed}
      title={config.title}
      decision={decision}
      onDecide={() => setDecision(null)}
      bonusGoal="no_data_lost"
      fixes={fixes}
      onTryFix={(fix) => fix.params && restart(fix.params as Record<string, ParamValue>)}
      share={{ daily: new Date().toISOString().slice(0, 10), anomalies: cardShown ? 1 : 0 }}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
