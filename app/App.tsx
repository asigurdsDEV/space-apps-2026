// The game shell: start screen -> (co-op lobby) -> mission builder (design phase) -> mission screen (after launch).
// The screens below only know about `Session` (app/session.ts). They never touch the game
// store, so solo, same-screen, host and guest play all use the same screens.

import { useState, type FormEvent } from 'react'
import { getDatasets, getScenario } from '../data'
import { LocalTransport } from '../net'
import { MAX_PLAYERS, type Config, type Dataset, type NetMessage } from '../shared'
import { simCore } from '../sim'
import { MissionBuilder } from '../ui/builder'
import { MissionScreen } from '../ui/mission'
import { startDriver } from './driver'
import { createGame } from './game'
import { Crew, Lobby, Notice, RoomCode } from './Lobby'
import { cleanRoomCode, openRoom } from './room'
import { createGuestSession, createHostSession, createSoloSession, ROLE_LABELS, type Session } from './session'
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

interface Active {
  session: Session
  /** Online rooms only. */
  roomCode: string | null
}

/** Start screen until a session exists, then the room (lobby, game, or "room closed"). */
export function Shell({ config, datasets }: ShellProps) {
  const [active, setActive] = useState<Active | null>(null)
  /** What is being waited for while a room opens, e.g. "Opening a room…". */
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const newGame = () => createGame({ config, datasets, sim: simCore })

  const playSolo = () => setActive({ session: createSoloSession(newGame(), { drive: startDriver }), roomCode: null })

  // One seat holding no role, so all four roles' controls work on this device. No network.
  const playSameScreen = () => {
    const session = createHostSession(newGame(), new LocalTransport<NetMessage>(), 'Crew', { drive: startDriver })
    session.start?.()
    setActive({ session, roomCode: null })
  }

  /** Host a new room (`joinCode` null) or join one. */
  const playOnline = async (name: string, joinCode: string | null) => {
    setError(null)
    setBusy(joinCode ? 'Joining the room…' : 'Opening a room…')
    try {
      const { transport, code } = await openRoom(joinCode)
      const session = joinCode
        ? createGuestSession(transport, name)
        : createHostSession(newGame(), transport, name, { drive: startDriver })
      setActive({ session, roomCode: code })
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : 'no connection'
      setError(`${joinCode ? 'Could not join that room' : 'Could not open a room'} (${detail}). Solo and same-screen play work without a network.`)
    } finally {
      setBusy(null)
    }
  }

  const exit = () => {
    active?.session.close()
    setActive(null)
  }

  if (!active) {
    return (
      <StartScreen
        config={config}
        busy={busy}
        error={error}
        onPlaySolo={playSolo}
        onSameScreen={playSameScreen}
        onHost={(name) => void playOnline(name, null)}
        onJoin={(name, code) => void playOnline(name, code)}
      />
    )
  }
  return <Room active={active} config={config} datasets={datasets} onExit={exit} />
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
  busy: string | null
  error: string | null
  onPlaySolo: () => void
  onSameScreen: () => void
  onHost: (name: string) => void
  onJoin: (name: string, code: string) => void
}

function StartScreen({ config, busy, error, onPlaySolo, onSameScreen, onHost, onJoin }: StartScreenProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const waiting = busy !== null

  const join = (event: FormEvent) => {
    event.preventDefault()
    if (cleanRoomCode(code) !== '') onJoin(name, cleanRoomCode(code))
  }

  return (
    <main className="app-start">
      <p className="app-kicker">{GAME_NAME}</p>
      <h1 className="app-start-title">{config.title}</h1>
      <p className="app-objective">{objectiveText(config)}</p>
      <div className="app-start-actions">
        <button type="button" className="app-button app-button-primary" onClick={onPlaySolo} disabled={waiting}>
          Play solo
        </button>
        <button type="button" className="app-button" onClick={onSameScreen} disabled={waiting}>
          Same screen
        </button>
      </div>

      <section className="app-coop" aria-labelledby="app-coop-title">
        <h2 id="app-coop-title" className="app-coop-title">
          Play together online
        </h2>
        <label className="app-field">
          <span>Your name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} autoComplete="nickname" />
        </label>
        <div className="app-start-actions">
          <button type="button" className="app-button" onClick={() => onHost(name)} disabled={waiting}>
            Host a game
          </button>
          <form className="app-join" onSubmit={join}>
            <label className="app-field">
              <span>Room code</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                maxLength={12}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button type="submit" className="app-button" disabled={waiting || cleanRoomCode(code) === ''}>
              Join a game
            </button>
          </form>
        </div>
        <p role="status">{busy}</p>
        {error && <p role="alert" className="app-error">{error}</p>}
      </section>
      <p className="app-start-note">
        Up to {MAX_PLAYERS} players, each on their own device, share one mission. “Same screen” puts every role on
        this device and needs no network.
      </p>
    </main>
  )
}

interface RoomProps {
  active: Active
  config: Config
  datasets: Dataset[]
  onExit: () => void
}

/** Picks the screen for the session's stage. */
function Room({ active, config, datasets, onExit }: RoomProps) {
  const { session, roomCode } = active
  const { stage, notice } = useSession(session)
  if (stage === 'lobby') return <Lobby session={session} roomCode={roomCode} onExit={onExit} />
  if (stage === 'closed') {
    return (
      <main className="app-start">
        <h1 className="app-start-title">The room is closed</h1>
        <p role="alert">{notice ?? 'The connection to the room was lost.'}</p>
        <div className="app-start-actions">
          <button type="button" className="app-button app-button-primary" onClick={onExit}>
            Main menu
          </button>
        </div>
      </main>
    )
  }
  return <GameScreen session={session} config={config} datasets={datasets} onExit={onExit} roomCode={roomCode} />
}

export interface GameScreenProps {
  session: Session
  config: Config
  /** Parts catalogs for the builder's tables. Static, so host and guests all have them. */
  datasets: Dataset[]
  /** Leave the game and go back to the start screen. */
  onExit: () => void
  /** Online rooms only: adds the crew menu (room code, roster, role picker) to the top bar. */
  roomCode?: string | null
}

/** The builder while the mission is being designed, the mission screen once it has launched. */
export function GameScreen({ session, config, datasets, onExit, roomCode }: GameScreenProps) {
  const snapshot = useSession(session)
  const { state, events, paused, speed, notice, players, me } = snapshot
  const designing = state.metrics.phase === 'design'

  return (
    <div className="app-game">
      <header className="app-bar">
        <span className="app-bar-title">{config.title}</span>
        {roomCode && (
          <details className="app-crew-menu">
            <summary className="app-button app-button-small">
              Crew ({players.length}) · {me.role ? ROLE_LABELS[me.role] : 'No role'}
            </summary>
            <div className="app-crew-panel">
              <RoomCode code={roomCode} />
              <Crew session={session} snapshot={snapshot} />
            </div>
          </details>
        )}
        <button type="button" className="app-button app-button-small" onClick={onExit}>
          Main menu
        </button>
      </header>
      <Notice session={session} notice={notice} />
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
