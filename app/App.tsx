// The game shell. It mounts every screen and switches between them:
// Start -> (online: Lobby) -> Briefing -> Builder -> launch -> Mission -> Results -> play again or main menu.
// The screens only get props. Everything about who runs the game is behind `Session` (app/session.ts),
// so solo, same-screen, host and guest play all use the same screens.

import { useEffect, useRef, useState, type ComponentType, type FormEvent } from 'react'
import { DIFFICULTIES, getDatasets, scenarios, withDifficulty, type Difficulty } from '../data'
import { LocalTransport } from '../net'
import type { Config, NetMessage, SimEvent, SimState, Summary } from '../shared'
import { catalogEntities, simCore } from '../sim'
import { Briefing } from '../ui/briefing'
import { MissionBuilder } from '../ui/builder'
import { LocalLeaderboard } from '../ui/leaderboard'
import { LobbyScreen } from '../ui/lobby'
import { MissionScreen } from '../ui/mission'
import { designFromHash, SharePanel } from '../ui/share'
import { StartScreen, type StartRequest } from '../ui/start'
import '../ui/theme/theme.css'
import '../ui/learn/learn.css'
import { Crew, Notice, RoomCode } from './Crew'
import { startDriver, timerClock } from './driver'
import { createGame, type Game } from './game'
import { cleanRoomCode, openRoom } from './room'
import { createGuestSession, createHostSession, createSoloSession, ROLE_LABELS, type Session } from './session'
import { useSession } from './useSession'
import './app.css'

export const GAME_NAME = 'Space Mission Design Game'

// Each scenario as written first, then its easier and harder versions.
const LEVELS: Difficulty[] = ['normal', ...(Object.keys(DIFFICULTIES) as Difficulty[]).filter((level) => level !== 'normal')]

/** Everything the Start screen offers: every scenario in data/ at every difficulty. */
export const SCENARIOS: Config[] = scenarios.flatMap((scenario) => LEVELS.map((level) => withDifficulty(scenario, level)))

/**
 * The parts catalogs as entities. Every player has them whatever the scenario, so an online host
 * leaves them out of its `state` messages (see app/session.ts) and guests put them back.
 */
export const BASELINE = catalogEntities(getDatasets())

/**
 * ui/start, ui/lobby and ui/mission only have a dark palette so far (light text is hard-coded),
 * so the theme is pinned to dark around them. Drop this once they use the ui/theme tokens.
 */
const DARK_ONLY = { className: 'game-theme app-page', 'data-theme': 'dark' } as const

export interface Active {
  session: Session
  /** Online rooms only. */
  roomCode: string | null
}

/** Start screen until a session exists, then the room (lobby, briefing, game, or "room closed"). */
export function App() {
  const [active, setActive] = useState<Active | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** A design from a shared link (ui/share) that no game has taken yet. */
  const link = useRef(typeof location === 'undefined' ? '' : location.hash)

  // A link pasted while the page is open: change the design on screen, or keep it for the next game.
  useEffect(() => {
    const onHash = () => {
      const session = active?.session
      if (session?.getSnapshot().state.metrics.phase === 'design') designFromHash(location.hash).forEach(session.send)
      else link.current = location.hash
    }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [active])

  const newGame = (config: Config): Game => {
    const game = createGame({ config, datasets: getDatasets(config.datasets), sim: simCore })
    designFromHash(link.current).forEach(game.send)
    link.current = ''
    return game
  }

  const playSolo = (config: Config, name: string) =>
    setActive({ session: createSoloSession(newGame(config), { name, drive: startDriver }), roomCode: null })

  // One seat holding no role, so all four roles' controls work on this device. No network, no lobby.
  const playSameScreen = (config: Config) => {
    const session = createHostSession(newGame(config), new LocalTransport<NetMessage>(), 'Crew', { drive: startDriver })
    session.start?.()
    setActive({ session, roomCode: null })
  }

  /** Host a new room for `config`, or join the room with `joinCode`. */
  const playOnline = async (name: string, config: Config | null, joinCode: string | null) => {
    setError(null)
    setBusy(true)
    try {
      const { transport, code } = await openRoom(joinCode)
      const session = config
        ? // Guests only see what the host steps, so an online host must not sleep in a background tab.
          createHostSession(newGame(config), transport, name, { drive: (game) => startDriver(game, timerClock()), baseline: BASELINE })
        : createGuestSession(transport, name, { baseline: BASELINE })
      setActive({ session, roomCode: code })
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : 'no connection'
      setError(`${joinCode ? 'Could not join that room' : 'Could not open a room'} (${detail}). Solo and one-screen play work without a network.`)
    } finally {
      setBusy(false)
    }
  }

  const start = (request: StartRequest) => {
    if (request.mode === 'join') return void playOnline(request.name, null, cleanRoomCode(request.code))
    const config = SCENARIOS.find((scenario) => scenario.scenario_id === request.scenarioId)
    if (!config) return setError('That mission is missing from this version of the game.')
    if (request.mode === 'solo') playSolo(config, request.name)
    else void playOnline(request.name, config, null)
  }

  const exit = () => {
    active?.session.close()
    setActive(null)
  }

  return (
    <div className="game-theme app">
      {active ? (
        <Room active={active} onExit={exit} />
      ) : (
        <div {...DARK_ONLY}>
          <StartScreen scenarios={SCENARIOS} onStart={start} busy={busy} error={error} />
          <SameScreen disabled={busy} onPlay={playSameScreen} />
        </div>
      )}
    </div>
  )
}

/** Under the Start screen: the no-network way to play together, which ui/start has no mode for. */
function SameScreen({ disabled, onPlay }: { disabled: boolean; onPlay: (config: Config) => void }) {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0]?.scenario_id ?? '')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const config = SCENARIOS.find((scenario) => scenario.scenario_id === scenarioId)
    if (config) onPlay(config)
  }
  return (
    <form className="app-same-screen" onSubmit={submit} aria-labelledby="app-same-screen-title">
      <div>
        <h2 id="app-same-screen-title">One screen, whole crew</h2>
        <p className="game-muted">No network needed. Everyone shares this device and every role’s controls are open.</p>
      </div>
      <label>
        Mission
        <select className="game-field" value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} disabled={disabled}>
          {SCENARIOS.map((scenario) => (
            <option key={scenario.scenario_id} value={scenario.scenario_id}>
              {scenario.title}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="game-button" disabled={disabled || scenarioId === ''}>
        Play on one screen
      </button>
    </form>
  )
}

/** A full-page message with one way out. */
function Closed({ title, text, onExit }: { title: string; text: string; onExit: () => void }) {
  return (
    <main className="app-closed">
      <div className="game-panel">
        <h1>{title}</h1>
        <p role="alert">{text}</p>
        <button type="button" className="game-button game-button--primary" onClick={onExit}>
          Main menu
        </button>
      </div>
    </main>
  )
}

/** Picks the screen for the session's stage. */
export function Room({ active, onExit }: { active: Active; onExit: () => void }) {
  const { session, roomCode } = active
  const { stage, notice, state, players, me } = useSession(session)
  /** Each player reads the briefing on their own screen and goes on when they are ready. */
  const [briefed, setBriefed] = useState(false)

  if (stage === 'lobby') {
    return (
      <div {...DARK_ONLY}>
        <LobbyScreen
          code={roomCode}
          players={players}
          me={me}
          onClaimRole={(role) => session.claimRole?.(role)}
          // The host's start() sends the first `state`, which moves every guest out of the lobby too.
          onContinue={() => session.start?.()}
          onLeave={onExit}
          error={notice}
        />
      </div>
    )
  }
  if (stage === 'closed') {
    return <Closed title="The room is closed" text={notice ?? 'The connection to the room was lost.'} onExit={onExit} />
  }
  // A guest learns the scenario from the host's state.
  const config = SCENARIOS.find((scenario) => scenario.scenario_id === state.scenario_id)
  if (!config) {
    return (
      <Closed
        title="Unknown mission"
        text="This room is playing a mission this version of the game does not have. Reload the page and join again."
        onExit={onExit}
      />
    )
  }
  // Someone who joins after launch goes straight to the flight.
  if (!briefed && state.metrics.phase === 'design') {
    return <Briefing config={config} onStart={() => setBriefed(true)} onBack={onExit} />
  }
  return <GameScreen session={session} config={config} onExit={onExit} roomCode={roomCode} />
}

export interface GameScreenProps {
  session: Session
  config: Config
  /** Leave the game and go back to the start screen. */
  onExit: () => void
  /** Online rooms only: adds the crew menu (room code, roster, role picker) to the top bar. */
  roomCode?: string | null
}

/** The builder while the mission is being designed, the flight once it has launched. */
export function GameScreen({ session, config, onExit, roomCode }: GameScreenProps) {
  const snapshot = useSession(session)
  const { state, notice, players, me } = snapshot
  const designing = state.metrics.phase === 'design'

  return (
    <div {...(designing ? { className: 'app-page' } : DARK_ONLY)}>
      <header className="app-bar">
        <span className="app-bar-title">{config.title}</span>
        {roomCode && (
          <details className="app-crew-menu">
            <summary className="game-button app-small">
              Crew ({players.length}) · {me.role ? ROLE_LABELS[me.role] : 'No role'}
            </summary>
            <div className="app-crew-panel">
              <RoomCode code={roomCode} />
              <Crew session={session} snapshot={snapshot} />
            </div>
          </details>
        )}
        <button type="button" className="game-button app-small" onClick={onExit}>
          Main menu
        </button>
      </header>
      <Notice session={session} notice={notice} />
      {designing ? (
        <>
          <MissionBuilder state={state} send={session.send} players={players} me={me} />
          <section className="app-share" aria-labelledby="app-share-title">
            <h2 id="app-share-title">Save, share and compare designs</h2>
            <SharePanel state={state} send={session.send} />
          </section>
        </>
      ) : (
        // Unmounts on reset, so every launch starts it fresh.
        <Flight session={session} title={config.title} />
      )}
    </div>
  )
}

/**
 * LAUNCH SEAM. ui/scene3d's launch sequence goes here: set this to its `LaunchView` and it is
 * shown after every successful launch, between the builder and the mission screen, until it
 * calls `onDone`. The sim keeps flying underneath (send `pause` and `resume` around it if the
 * sequence should hold the clock). While it is null the game goes straight to the mission screen.
 */
const LaunchView = null as ComponentType<{ state: SimState; onDone: () => void }> | null

/** The summary the sim sent with `scenario_ended`. */
function finalSummary(events: readonly SimEvent[]): Summary | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (event.type === 'scenario_ended') return event.payload.summary
  }
  return undefined
}

/** Everything after launch: (the launch sequence,) cruise and operations, then the results with the personal best. */
function Flight({ session, title }: { session: Session; title: string }) {
  const { state, events, paused, speed } = useSession(session)
  const [launchDone, setLaunchDone] = useState(false)
  const ended = state.status === 'ended'

  if (LaunchView && !launchDone && !ended) return <LaunchView state={state} onDone={() => setLaunchDone(true)} />

  const summary = ended ? finalSummary(events) : undefined
  return (
    <>
      <MissionScreen state={state} events={events} onCommand={session.send} paused={paused} speed={speed} title={title} summary={summary} />
      {summary && typeof summary.score === 'number' && (
        <div className="app-best">
          <LocalLeaderboard scenarioId={state.scenario_id} summary={summary} design={state.params} />
        </div>
      )}
    </>
  )
}
