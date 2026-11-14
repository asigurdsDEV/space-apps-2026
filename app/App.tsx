// The game shell: start screen -> mission builder (design phase) -> mission screen (after launch).
// The screens below only know about `Session` (app/session.ts). They never touch the game
// store, so a co-op session can be dropped in without changing them.

import { useState } from 'react'
import { getDatasets, getScenario } from '../data'
import type { Config, Dataset } from '../shared'
import { simCore } from '../sim'
import { MissionBuilder } from '../ui/builder'
import { MissionScreen } from '../ui/mission'
import { startDriver } from './driver'
import { createGame } from './game'
import { createSoloSession, type Session } from './session'
import { BUILDER_SLOTS } from './slots'
import { useSession } from './useSession'
import './app.css'

const GAME_NAME = 'Space Mission Design Game'
const SCENARIO_ID = 'demo'

const scenario = getScenario(SCENARIO_ID)
const scenarioDatasets = scenario ? getDatasets(scenario.datasets) : []

export function App() {
  if (!scenario) {
    return (
      <main className="app-start">
        <h1 className="app-start-title">{GAME_NAME}</h1>
        <p role="alert">The “{SCENARIO_ID}” scenario is missing from data/, so there is nothing to play yet.</p>
      </main>
    )
  }
  return <Shell config={scenario} datasets={scenarioDatasets} />
}

export interface ShellProps {
  config: Config
  /** The scenario's parts catalogs. */
  datasets: Dataset[]
}

/** Start screen until a session exists, then the game. */
export function Shell({ config, datasets }: ShellProps) {
  const [session, setSession] = useState<Session | null>(null)

  const playSolo = () => {
    const game = createGame({ config, datasets, sim: simCore })
    setSession(createSoloSession(game, { drive: startDriver }))
  }

  // CO-OP: add hostGame / joinGame here. Each builds a Session (see the note above
  // createSoloSession in app/session.ts) and calls setSession with it, exactly like playSolo.
  // Then pass them to StartScreen and enable its two buttons. GameScreen needs no change.

  const exit = () => {
    session?.close()
    setSession(null)
  }

  if (!session) return <StartScreen config={config} onPlaySolo={playSolo} />
  return <GameScreen session={session} config={config} datasets={datasets} onExit={exit} />
}

/** The scenario's mission brief, when the scenario file has one. */
function objectiveText(config: Config): string {
  const text = config.params.objective_text
  return typeof text === 'string' && text.trim() !== ''
    ? text
    : 'Design a spacecraft that fits its mass, power and budget limits, then launch it and fly the mission.'
}

interface StartScreenProps {
  config: Config
  onPlaySolo: () => void
}

function StartScreen({ config, onPlaySolo }: StartScreenProps) {
  return (
    <main className="app-start">
      <p className="app-kicker">{GAME_NAME}</p>
      <h1 className="app-start-title">{config.title}</h1>
      <p className="app-objective">{objectiveText(config)}</p>
      <div className="app-start-actions">
        <button type="button" className="app-button app-button-primary" onClick={onPlaySolo}>
          Play solo
        </button>
        {/* CO-OP: remove `disabled` and the "Coming soon" tags, and wire onClick to the
            hostGame / joinGame handlers added in Shell above (join also needs a room-code field). */}
        <button type="button" className="app-button" disabled>
          Host a game <span className="app-soon">Coming soon</span>
        </button>
        <button type="button" className="app-button" disabled>
          Join a game <span className="app-soon">Coming soon</span>
        </button>
      </div>
      <p className="app-start-note">Online co-op for up to 4 players is on its way.</p>
    </main>
  )
}

export interface GameScreenProps {
  session: Session
  config: Config
  /** Parts catalogs for the builder's tables. Static, so host and guests all have them. */
  datasets: Dataset[]
  /** Leave the game and go back to the start screen. */
  onExit: () => void
}

/** The builder while the mission is being designed, the mission screen once it has launched. */
export function GameScreen({ session, config, datasets, onExit }: GameScreenProps) {
  const { state, events, paused, speed, notice } = useSession(session)
  const designing = state.metrics.phase === 'design'

  return (
    <div className="app-game">
      <header className="app-bar">
        <span className="app-bar-title">{config.title}</span>
        {/* CO-OP: room code, the roster and the role picker go here (snapshot.players, snapshot.me). */}
        <button type="button" className="app-button app-button-small" onClick={onExit}>
          Main menu
        </button>
      </header>
      <div role="status">{notice && <p className="app-notice">{notice}</p>}</div>
      {designing ? (
        <MissionBuilder state={state} datasets={datasets} send={session.send} slots={BUILDER_SLOTS} />
      ) : (
        <MissionScreen
          state={state}
          events={events}
          onCommand={session.send}
          paused={paused}
          speed={speed}
          title={config.title}
        />
      )}
    </div>
  )
}
