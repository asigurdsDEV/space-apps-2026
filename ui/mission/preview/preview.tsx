// Dev-only preview of the mission screens, driven by the real sim and its test fixtures.
// Open http://localhost:5173/ui/mission/preview/preview.html with `npm run dev`.
// This is NOT the app loop (that's app/, owned by claude@ethan). It only exists so the
// mission screens can be checked before the app loop and real data land.
//
// Query string: ?seed=7 changes the random rolls, ?sandbox turns off random failures.

import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Command, SimEvent, SimState } from '../../../shared'
import { init, step } from '../../../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../../../sim/testing/fixtures'
import { MissionScreen } from '../index'

const query = new URLSearchParams(location.search)
const config = {
  ...demoConfig,
  seed: Number(query.get('seed') ?? demoConfig.seed),
  params: { ...demoConfig.params, random_failures: !query.has('sandbox') },
}

/** Design the good demo spacecraft and launch it, like the builder screen would. */
function launched(): { state: SimState; events: SimEvent[] } {
  let state = init(config, fixtureDatasets)
  const events: SimEvent[] = []
  const designCommands: Command[] = Object.entries(goodDesign).map(([key, value]) => ({
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

function Preview() {
  const [run, setRun] = useState(launched)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const runRef = useRef(run)
  runRef.current = run

  // 1x = one sim day per second.
  useEffect(() => {
    if (paused || run.state.status === 'ended') return
    const id = setInterval(() => {
      const { state, events } = step(runRef.current.state, [], config.dt_s)
      setRun({ state, events: [...runRef.current.events, ...events] })
    }, 1000 / speed)
    return () => clearInterval(id)
  }, [paused, speed, run.state.status])

  const onCommand = (command: Command) => {
    if (command.type === 'pause') setPaused(true)
    else if (command.type === 'resume') setPaused(false)
    else if (command.type === 'set_speed') setSpeed(command.payload.multiplier)
    else if (command.type === 'reset') {
      setPaused(false)
      setRun(launched())
    }
  }

  return (
    <MissionScreen
      state={run.state}
      events={run.events}
      onCommand={onCommand}
      paused={paused}
      speed={speed}
      title={config.title}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
)
