// Dev-only preview of the mission screens, driven by the real sim and its test fixtures.
// Open http://localhost:5173/ui/mission/preview/preview.html with `npm run dev`.
// This is NOT the app loop (that's app/, owned by claude@ethan). It only exists so the
// mission screens can be checked before the app loop and real data land.
//
// Query string: ?seed=7 changes the random rolls, ?sandbox turns off random failures,
// ?weak flies a design with one ground station (loses data, so the debrief has fixes to show).
//
// Space weather is REAL (data/space-weather, NASA OMNI): the mission replays the real days from
// ?weather=YYYY-MM-DD (default 2003-10-01, so the Halloween 2003 storms hit on their real dates).
// The storm card fires on the first real G3+ day; until the sim emits `decision_required`
// (decision 004) the choice has no effect here. The what-if fixes are real reruns of the sim.

import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Command, ParamValue, SimEvent, SimState } from '../../../shared'
import { weatherForMissionDay } from '../../../data/space-weather'
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
const WEATHER_START = query.get('weather') ?? '2003-10-01'

/** ANOMALY_CARDS.md #3, triggered by a real storm day. */
const stormCard = (date: string, g: number): Decision => ({
  decision_id: `storm-${date}`,
  card_id: 'geomagnetic-storm',
  title: `G${g} geomagnetic storm`,
  body: "A burst from the Sun is heating Earth's upper atmosphere, and it puffs up. More air at your altitude means more drag pulling you down.",
  console: 'mission-planning',
  options: [
    { id: 'a', label: 'Go to safe mode, edge-on to the wind', effect_text: 'Lose 2 days of science. Drag mostly avoided.' },
    { id: 'b', label: 'Keep observing', effect_text: "Fine if you're high enough. Very risky in a low orbit." },
  ],
  story: {
    mission: `Real storm, ${date}`,
    year: date.slice(0, 4),
    text: 'This storm really happened on this date (NASA OMNI data). In February 2022, a much smaller G1 storm raised drag enough to bring down about 40 new Starlink satellites.',
  },
})

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
  const weather = weatherForMissionDay(WEATHER_START, Number(run.state.metrics.mission_day ?? 0))
  const [fixes, setFixes] = useState<WhatIfFix[]>([])
  const runRef = useRef(run)
  runRef.current = run

  // 1x = one sim day per second. Stops while a card is open, like the sim will.
  useEffect(() => {
    if (paused || decision || run.state.status === 'ended') return
    const id = setInterval(() => {
      const { state, events } = step(runRef.current.state, [], config.dt_s)
      setRun({ state, events: [...runRef.current.events, ...events] })
      const today = weatherForMissionDay(WEATHER_START, Number(state.metrics.mission_day ?? 0))
      if (!cardShown && state.metrics.phase === 'operations' && today && today.storm_g >= 3) {
        setDecision(stormCard(today.date, today.storm_g))
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
      spaceWeather={run.state.metrics.phase === 'operations' ? weather : null}
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
