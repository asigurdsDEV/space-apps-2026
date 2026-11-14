// The game shell. It mounts every screen and switches between them:
// Start -> (online: Lobby) -> Briefing -> Builder -> launch -> Mission -> Results -> play again or main menu.
// The screens only get props. Everything about who runs the game is behind `Session` (app/session.ts),
// so solo, same-screen, host and guest play all use the same screens.

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from 'react'
import { realStorms } from '../data/space-weather/storms'
import { DIFFICULTIES, getDatasets, getScenario, realMissions, rowsAsObjects, scenarios, withDifficulty, type Difficulty } from '../data'
import { LocalTransport } from '../net'
import type { Config, NetMessage, SimEvent, SimState, Summary } from '../shared'
import { canSend, ROLES } from '../shared'
import { catalogEntities, choicesOf, pendingDecision, simCore, whatIf } from '../sim'
import { playSound, SoundToggle } from '../ui/audio'
import { Briefing } from '../ui/briefing'
import { MissionBuilder } from '../ui/builder'
import { GoNoGoPoll } from '../ui/gonogo'
import { LocalLeaderboard } from '../ui/leaderboard'
import { LobbyScreen } from '../ui/lobby'
import { MissionScreen, stars } from '../ui/mission'
import { LaunchView as SceneLaunchView } from '../ui/scene3d'
import { designFromHash, SharePanel } from '../ui/share'
import { dailyMissionForDate, StartScreen, type DailyMission, type DailyMissionRequest, type StartRequest } from '../ui/start'
import { BuilderTutorial } from '../ui/tutorial'
import '../ui/theme/theme.css'
import '../ui/learn/learn.css'
import { Crew, Notice, RoomCode } from './Crew'
import { ErrorBoundary } from './ErrorBoundary'
import { StoryLayer } from './StoryLayer'
import { Walk, WalkTo } from './Walk'
import { startDriver, timerClock } from './driver'
import { createGame, type Game } from './game'
import { cleanRoomCode, openRoom } from './room'
import { createGuestSession, createHostSession, createSoloSession, ROLE_LABELS, type Session } from './session'
import { useChance } from './useChance'
import { useSession } from './useSession'
import './app.css'

export const GAME_NAME = 'Space Mission Design Game'

// Each scenario as written first, then its easier and harder versions.
const LEVELS: Difficulty[] = ['normal', ...(Object.keys(DIFFICULTIES) as Difficulty[]).filter((level) => level !== 'normal')]

/** Every scenario in data/ at every difficulty: all the missions the Start screen can make, found by `scenario_id`. */
export const SCENARIOS: Config[] = scenarios.flatMap((scenario) => LEVELS.map((level) => withDifficulty(scenario, level)))

/**
 * The parts catalogs as entities. Every player has them whatever the scenario, so an online host
 * leaves them out of its `state` messages (see app/session.ts) and guests put them back.
 */
export const BASELINE = catalogEntities(getDatasets())

/** Real missions for the debrief's "your mission is most like…" line. */
const REAL_MISSIONS = rowsAsObjects(realMissions)

/**
 * Anomaly cards per mission (GAME_DESIGN.md §4.2), from data/'s DIFFICULTIES. A scenario's own `anomaly_cards` wins.
 * Also the real NASA space weather the mission flies through: `weather_start` (the real date of launch day)
 * and `real_storms` (its real G3+ storm days), so the storm card hits on the days storms really happened.
 */
export const withCards = (config: Config): Config => {
  const start = weatherStart(config, config.seed)
  const days = Math.ceil(Number(config.params.mission_duration_s ?? config.duration_s) / 86_400) || 0
  return {
    ...config,
    params: {
      anomaly_cards: DIFFICULTIES[(config.params.difficulty as Difficulty) ?? 'normal']?.anomaly_cards ?? 2,
      weather_start: start,
      real_storms: realStorms(start, days),
      ...config.params,
    },
  }
}

/**
 * ui/mission only has a dark palette so far, so the theme is pinned to dark around the flight
 * and the results. Drop this once it uses the ui/theme tokens.
 */
const DARK_ONLY = { className: 'game-theme app-page', 'data-theme': 'dark' } as const

export interface Active {
  session: Session
  /** Online rooms only. */
  roomCode: string | null
  /** Set when this game is today's daily mission. */
  daily?: DailyMission
}

/** Today's UTC date (YYYY-MM-DD). Checked every minute and when the page gets focus again, so the daily mission turns over at UTC midnight. */
function useUtcDay(): string {
  const today = () => new Date().toISOString().slice(0, 10)
  const [day, setDay] = useState(today)
  useEffect(() => {
    const check = () => setDay(today())
    const timer = setInterval(check, 60_000)
    addEventListener('focus', check)
    return () => {
      clearInterval(timer)
      removeEventListener('focus', check)
    }
  }, [])
  return day
}

/** Start screen until a session exists, then the room (lobby, briefing, game, or "room closed"). */
export function App() {
  const [active, setActive] = useState<Active | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** A design from a shared link (ui/share) that no game has taken yet. */
  const link = useRef(typeof location === 'undefined' ? '' : location.hash)
  // Same day, same scenario and same seed for everyone (ui/start/daily.ts).
  const daily = dailyMissionForDate(new Date(useUtcDay()), scenarios.map((scenario) => scenario.scenario_id))

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
    const game = createGame({ config: withCards(config), datasets: getDatasets(config.datasets), sim: simCore })
    designFromHash(link.current).forEach(game.send)
    link.current = ''
    return game
  }

  const playSolo = (config: Config, name: string, daily?: DailyMission) =>
    setActive({ session: createSoloSession(newGame(config), { name, drive: startDriver }), roomCode: null, daily })

  // The daily mission is the scenario as written (Normal) with the day's seed.
  const playDaily = (request: DailyMissionRequest) => {
    const config = getScenario(request.scenarioId)
    if (!config) return setError('Today’s mission is missing from this version of the game.')
    playSolo({ ...config, seed: request.seed }, request.name, request)
  }

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
    const config = getScenario(request.scenarioId, request.difficulty)
    if (!config) return setError('That mission is missing from this version of the game.')
    if (request.mode === 'solo') playSolo(config, request.name)
    else void playOnline(request.name, config, null)
  }

  const exit = () => {
    active?.session.close()
    setActive(null)
  }
  useScrollToTop(active ? 'room' : 'start')

  return (
    <div className="game-theme app">
      {active ? (
        <ErrorBoundary resetKey={active} actions={[{ label: 'Main menu', run: exit }]}>
          <Room active={active} onExit={exit} />
        </ErrorBoundary>
      ) : (
        <>
          <StartScreen
            scenarios={scenarios}
            scenarioPreview={getScenario}
            dailyMission={daily}
            onDailyMission={playDaily}
            onStart={start}
            busy={busy}
            error={error}
          />
          <SameScreen disabled={busy} onPlay={playSameScreen} />
        </>
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
  useScrollToTop(stage === 'lobby' || stage === 'closed' ? stage : !briefed && state.metrics.phase === 'design' ? 'briefing' : 'game')

  if (stage === 'lobby') {
    return (
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
  // The hall stays mounted under every screen from here on, so each screen change is a walk (app/Walk.tsx).
  return (
    <Walk state={state} title={config.title}>
      {/* Someone who joins after launch goes straight to the flight. */}
      {!briefed && state.metrics.phase === 'design' ? (
        <>
          <WalkTo screen="briefing" />
          <Briefing config={config} onStart={() => setBriefed(true)} onBack={onExit} />
          <StoryLayer screen="briefing" scenarioId={state.scenario_id} />
        </>
      ) : (
        <GameScreen session={session} config={config} onExit={onExit} roomCode={roomCode} daily={active.daily} />
      )}
    </Walk>
  )
}

export interface GameScreenProps {
  session: Session
  config: Config
  /** Leave the game and go back to the start screen. */
  onExit: () => void
  /** Online rooms only: adds the crew menu (room code, roster, role picker) to the top bar. */
  roomCode?: string | null
  /** Set when this game is today's daily mission: its record and share card are kept apart. */
  daily?: DailyMission
}

/** The builder while the mission is being designed, the flight once it has launched. */
export function GameScreen({ session, config, onExit, roomCode, daily }: GameScreenProps) {
  const snapshot = useSession(session)
  const { state, notice, players, me } = snapshot
  const designing = state.metrics.phase === 'design'
  useScrollToTop(designing ? 'design' : 'flight')
  const backToBuilder = () => session.send({ type: 'reset', payload: {} })

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
        <SoundToggle />
        <button type="button" className="game-button app-small" onClick={onExit}>
          Main menu
        </button>
      </header>
      <Notice session={session} notice={notice} />
      <ErrorBoundary
        resetKey={designing}
        actions={[
          { label: 'Back to the builder', run: backToBuilder },
          { label: 'Main menu', run: onExit },
        ]}
      >
        {designing ? (
          <Design session={session} config={config} />
        ) : (
          // Unmounts on reset, so every launch starts it fresh.
          <Flight session={session} config={config} daily={daily} online={roomCode !== null} />
        )}
      </ErrorBoundary>
    </div>
  )
}

/** Every new screen starts at the top of the page; without this the old scroll position carried over. */
function useScrollToTop(screen: string) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])
}

/** A ref that never changes, so React calls it once, when the element appears. */
const focusOnMount = (node: HTMLElement | null) => node?.focus()

/** The design phase: the builder with save-and-share under it, then the GO / NO-GO poll before launch. */
function Design({ session, config }: { session: Session; config: Config }) {
  const { state, players, me } = useSession(session)
  const chance = useChance(config, state.params, !state.issues.some((i) => i.severity === 'error'))
  /** The builder's Launch button opens the poll; the poll's Launch button sends the command. */
  const [polling, setPolling] = useState(false)
  useScrollToTop(polling ? 'poll' : 'builder')

  if (polling) {
    return (
      // Focused when it opens, so keyboard and screen-reader players land on the poll, not at the top of the page.
      <main className="app-poll" tabIndex={-1} ref={focusOnMount}>
        <WalkTo screen="poll" />
        <GoNoGoPoll
          issues={state.issues}
          onLaunch={() => session.send({ type: 'launch', payload: {} })}
          onBack={() => setPolling(false)}
        />
        <StoryLayer screen="poll" scenarioId={state.scenario_id} />
      </main>
    )
  }
  return (
    <>
      <WalkTo screen="design" />
      <BuilderTutorial />
      <StoryLayer screen="design" scenarioId={state.scenario_id} />
      <MissionBuilder
        state={state}
        send={(command) => (command.type === 'launch' ? setPolling(true) : session.send(command))}
        players={players}
        me={me}
        chance={chance}
      />
      <section className="app-share" aria-labelledby="app-share-title">
        <h2 id="app-share-title">Save, share and compare designs</h2>
        <SharePanel state={state} send={session.send} />
      </section>
    </>
  )
}

/**
 * The launch cinematic from ui/scene3d (decision 005's launch cutscene), shown after every
 * successful launch, between the poll and the mission screen, until it calls `onDone` (it has
 * its own Skip). Set this to null and the game goes straight to the mission screen.
 */
const LaunchView = SceneLaunchView as ComponentType<{ state: SimState; onDone: () => void }> | null
/** The story layer's plain launch cutscene is not played on top of the real one. */
const SHOWN_BY_APP = ['launch']

/** The summary the sim sent with `scenario_ended`. */
function finalSummary(events: readonly SimEvent[]): Summary | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (event.type === 'scenario_ended') return event.payload.summary
  }
  return undefined
}

const DAY_MS = 86_400_000

/**
 * The first real day of space weather a mission replays (data/space-weather/README.md): the
 * scenario's `weather_start`, or else a day picked by the seed between 1996 and 2021, so that
 * even a three-year mission stays inside the data.
 */
export function weatherStart(config: Config, seed: number): string {
  const chosen = config.params.weather_start
  if (typeof chosen === 'string') return chosen
  return new Date(Date.UTC(1996, 0, 1) + ((Math.abs(Math.trunc(seed)) * 7919) % 9500) * DAY_MS).toISOString().slice(0, 10)
}

type SpaceWeatherData = typeof import('../data/space-weather')

/** Everything after launch: (the launch sequence,) cruise and operations, then the results with the personal best. */
function Flight({ session, config, daily, online }: { session: Session; config: Config; daily?: DailyMission; online?: boolean }) {
  const { state, events, paused, speed, players, me } = useSession(session)
  // A late joiner or a reload lands mid-mission: no launch to watch.
  const [launchDone, setLaunchDone] = useState(() => session.getSnapshot().state.t_s > 86400)
  // 340 kB of real NASA data, so it is loaded only once a mission flies.
  const [weather, setWeather] = useState<SpaceWeatherData | null>(null)
  useEffect(() => {
    if (session.getSnapshot().state.status !== 'ended') playSound('launch') // Flight mounts when the mission leaves design
    if (LaunchView && !launchDone) holdClock(true) // nothing flies unseen during the launch
    void import('../data/space-weather').then(setWeather, () => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const ended = state.status === 'ended'
  // Story cutscenes (decision 005) hold the mission clock so nothing happens unseen. Online the
  // clock is shared by the whole crew, so it keeps running there.
  const heldClock = useRef(false)
  const holdClock = (playing: boolean) => {
    if (online) return
    if (playing && !session.getSnapshot().paused) {
      heldClock.current = true
      session.send({ type: 'pause', payload: {} })
    } else if (!playing && heldClock.current) {
      heldClock.current = false
      session.send({ type: 'resume', payload: {} })
    }
  }
  // "What would have fixed it": the flown mission rerun with every single change, once, when it ends,
  // answering each anomaly card the way the player did.
  const fixes = useMemo(
    () => (ended ? whatIf({ ...withCards(config), seed: daily?.seed ?? config.seed }, getDatasets(config.datasets), state.params, choicesOf(events)) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ended],
  )

  if (LaunchView && !launchDone && !ended) {
    const done = () => {
      holdClock(false)
      setLaunchDone(true)
    }
    return (
      <>
        <WalkTo screen="launch" />
        <LaunchView state={state} onDone={done} />
      </>
    )
  }

  const summary = ended ? finalSummary(events) : undefined
  const bonusGoal = typeof config.params.bonus_goal === 'string' ? config.params.bonus_goal : undefined
  const day = state.metrics.mission_day
  // The anomaly card waiting for an answer, read from the state so a late joiner or a reload still sees it.
  const decision = pendingDecision(state)
  const console = ROLES.find((role) => role === decision?.console) ?? null
  const tryFix = (fix: { params?: SimState['params'] }) => {
    session.send({ type: 'reset', payload: {} })
    for (const [key, value] of Object.entries(fix.params ?? {})) session.send({ type: 'set_param', payload: { key, value } })
  }
  const decide = (decision_id: string, option_id: string) => session.send({ type: 'resolve_decision', payload: { decision_id, option_id } })
  return (
    <>
      <WalkTo screen={ended ? 'results' : 'flight'} />
      <MissionScreen
        state={state}
        events={events}
        onCommand={session.send}
        paused={paused}
        speed={speed}
        title={config.title}
        summary={summary}
        bonusGoal={bonusGoal}
        share={{ daily: daily?.date, anomalies: String(state.metrics.cards_drawn ?? '').split(',').filter(Boolean).length }}
        decision={decision}
        fixes={fixes}
        onTryFix={tryFix}
        realMissions={REAL_MISSIONS}
        onDecide={decide}
        canDecide={canSend(me.role, { type: 'resolve_decision', payload: { decision_id: '', option_id: '' } }, players.map((p) => p.role), console)}
        spaceWeather={weather && typeof day === 'number' ? weather.weatherForMissionDay(weatherStart(config, daily?.seed ?? config.seed), day) : null}
      />
      {summary && typeof summary.score === 'number' && (
        <div className="app-best">
          <LocalLeaderboard
            scenarioId={state.scenario_id}
            summary={summary}
            design={state.params}
            dailySeed={daily?.seed}
            stars={stars(summary, bonusGoal).filter((star) => star.earned).length}
          />
        </div>
      )}
      <StoryLayer screen="flight" events={events} scenarioId={state.scenario_id} onCutscene={holdClock} shown={SHOWN_BY_APP} />
    </>
  )
}
