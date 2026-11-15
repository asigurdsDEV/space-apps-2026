// The game shell. It mounts every screen and switches between them:
// Start -> (online: Lobby) -> Briefing -> Builder -> launch -> Mission -> Results -> play again or main menu.
// The screens only get props. Everything about who runs the game is behind `Session` (app/session.ts),
// so solo, same-screen, host and guest play all use the same screens.

import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from 'react'
import { realStorms } from '../data/space-weather/storms'
import { DIFFICULTIES, PROGRAM, getDatasets, getScenario, realMissions, rowsAsObjects, scenarios, withDifficulty, type Difficulty } from '../data'
import { LocalTransport } from '../net'
import type { Config, NetMessage, SimEvent, SimState, Summary } from '../shared'
import { canSend, MAX_PLAYERS, ROLES } from '../shared'
import { catalogEntities, choicesOf, pendingDecision, simCore, whatIf } from '../sim'
import { SoundToggle } from '../ui/audio'
import { Briefing } from '../ui/briefing'
import { MissionBuilder } from '../ui/builder'
import { commandAccess } from '../ui/builder/model'
import { GoNoGoPoll, LaunchAnyway } from '../ui/gonogo'
import { LocalLeaderboard } from '../ui/leaderboard'
import { CampaignBoard } from '../ui/campaign/CampaignBoard'
import { awardMission, canStartMission, MISSIONS } from '../ui/campaign/model'
import { readCampaign, saveCampaign } from '../ui/campaign/storage'
import { LobbyScreen } from '../ui/lobby'
import { MissionScreen, stars } from '../ui/mission'
import { LaunchView as SceneLaunchView } from '../ui/scene3d'
import { designFromHash, SharePanel } from '../ui/share'
import { dailyMissionForDate, StartScreen, type DailyMissionRequest, type StartRequest } from '../ui/start'
import { BuilderTutorial } from '../ui/tutorial'
import '../ui/theme/theme.css'
import '../ui/learn/learn.css'
import { Crew, Notice, RoomCode } from './Crew'
import { DailyEventDialog } from './DailyEventDialog'
import { eventMission, loadDailyEvent, withEvent, type DailyEvent, type DailyPlay } from './dailyEvent'
import { ErrorBoundary } from './ErrorBoundary'
import { StoryLayer } from './StoryLayer'
import { WalkTo } from './Walk'
import { World, WORLD_3D } from './World'
import { startDriver, timerClock } from './driver'
import { createGame, type Game } from './game'
import { cleanRoomCode, openRoom } from './room'
import { createGuestSession, createHostSession, createSoloSession, ROLE_LABELS, type Session } from './session'
import { useChance } from './useChance'
import { useSession } from './useSession'
import { launchCause, tryAgain, WhatWentWrong } from './WhatWentWrong'
import './app.css'

export const GAME_NAME = 'First Flight'

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

/**
 * Why a room could not be opened or joined, in words for a student. `detail` is net/'s error text.
 * A code no room has fails at once ("Could not connect to peer smdg-…"); a room that does not
 * answer in time is usually full, because net/ drops a fifth connection without a word.
 */
export function roomError(joining: boolean, detail: string): string {
  const tail = 'Solo and one-screen play work without a network.'
  if (!joining) return `Could not open a room (${detail}). ${tail}`
  if (/^Could not connect to peer/.test(detail)) return `Could not join that room: no open room has that code. Check the code with your host. ${tail}`
  if (/timed out/i.test(detail)) return `Could not join that room: it did not answer. It may be full (${MAX_PLAYERS} players at most), or the network may be blocking the connection. ${tail}`
  return `Could not join that room (${detail}). ${tail}`
}

export interface Active {
  session: Session
  /** Online rooms only. */
  roomCode: string | null
  /** Set when this game is today's daily mission (with the real event it is built on, when there is one). */
  daily?: DailyPlay
  /** Solo guided assignment; free play and Daily never award campaign funding. */
  campaign?: string
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
  // Explicit Classic links keep their existing free-play landing; Guided missions remains available.
  const [guided, setGuided] = useState(() => typeof location === 'undefined' || new URLSearchParams(location.search).get('world') !== 'classic')
  const [campaignRun, setCampaignRun] = useState(0)
  const [progress, setProgress] = useState(readCampaign)
  const [persistent, setPersistent] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** A design from a shared link (ui/share) that no game has taken yet. */
  const link = useRef(typeof location === 'undefined' ? '' : location.hash)
  // Same day, same scenario and same seed for everyone (ui/start/daily.ts).
  const daily = dailyMissionForDate(new Date(useUtcDay()), PROGRAM)
  /** Today's real event (app/dailyEvent.ts), looked up while the Start screen shows so the Play button never waits on the network. */
  const [todays, setTodays] = useState<{ date: string; event: DailyEvent } | null>(null)
  /** The daily the player asked for, while the "Today's event" dialog is open. */
  const [asking, setAsking] = useState<DailyMissionRequest | null>(null)
  const date = daily?.date
  // Asked for as soon as no game is running (the campaign board too), so it is usually here before the Play button is.
  const onStart = !active
  const looking = useRef<Promise<DailyEvent | null> | null>(null)
  useEffect(() => {
    if (!onStart || !date) return
    let gone = false
    const look = loadDailyEvent(date)
    looking.current = look
    void look.then((event) => { if (!gone && event) setTodays({ date, event }) })
    return () => { gone = true; looking.current = null }
  }, [onStart, date])
  const event = todays?.date === date ? todays?.event : undefined

  useEffect(() => { setPersistent(saveCampaign(progress)) }, [progress])
  useEffect(() => {
    if (!active?.campaign) return
    const id = active.campaign
    const check = () => {
      const { state, events } = active.session.getSnapshot()
      if (state.status === 'ended') setProgress((previous) => awardMission(previous, id, state, events))
    }
    check()
    return active.session.subscribe(check)
  }, [active])

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

  const playSolo = (config: Config, name: string, daily?: DailyPlay, campaign?: string) =>
    setActive({ session: createSoloSession(newGame(config), { name, drive: startDriver }), roomCode: null, daily, campaign })

  // The daily mission is the scenario as written (Normal) with the day's seed; with a real event, the Earth-orbit mission that meets it first.
  const flyDaily = (request: DailyMissionRequest, event?: DailyEvent) => {
    const mission = event ? eventMission(request, event) : request
    const config = getScenario(mission.scenarioId)
    if (!config) return setError('Today’s mission is missing from this version of the game.')
    playSolo(withEvent({ ...config, seed: mission.seed }, event), mission.name, mission)
  }
  // No event yet (the feeds are slow or silent): today's ordinary daily starts at once.
  // A press before the feeds have answered waits for them (4 s at most, app/dailyEvent.ts) rather than flying the ordinary daily.
  const playDaily = (request: DailyMissionRequest) => {
    if (event) return setAsking(request)
    const look = looking.current
    if (!look) return flyDaily(request)
    looking.current = null // a second press while waiting starts nothing twice
    void look.then((found) => {
      if (!found) return flyDaily(request)
      setTodays({ date: request.date, event: found })
      setAsking(request)
    })
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
      setError(roomError(joinCode !== null, detail))
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

  const startCampaign = (id: string, name: string) => {
    const mission = MISSIONS.find((m) => m.id === id)
    if (!mission || !canStartMission(progress, id)) return
    active?.session.close()
    // Retrying the same assignment must reset the room and its cutscene state too.
    setCampaignRun((run) => run + 1)
    playSolo(mission.config, name, undefined, id)
  }

  const exit = () => {
    active?.session.close()
    setActive(null)
  }
  // A closed tab sends nothing by itself, and net/ does not notice a dead connection: without
  // this the host kept the seat and the role, and guests were never told the host had gone.
  useEffect(() => {
    if (!active?.roomCode) return
    addEventListener('pagehide', exit)
    return () => removeEventListener('pagehide', exit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
  useScreen(active ? 'room' : guided ? 'campaign' : 'start', active ? undefined : '')

  return (
    <div className="game-theme app">
      {active ? (
        <ErrorBoundary resetKey={active} actions={[{ label: 'Main menu', run: exit }]}>
          <Room key={campaignRun} active={active} onExit={exit}
            onCampaignNext={(id) => startCampaign(id, active.session.getSnapshot().me.name)} />
        </ErrorBoundary>
      ) : guided ? (
        <CampaignBoard progress={progress} persistent={persistent} onStart={startCampaign} onFreePlay={() => setGuided(false)} />
      ) : (
        <>
          <button type="button" className="game-button campaign-return" onClick={() => setGuided(true)}>Guided missions</button>
          <StartScreen
            scenarios={scenarios}
            scenarioPreview={getScenario}
            dailyMission={daily && event ? eventMission(daily, event) : daily}
            onDailyMission={playDaily}
            onStart={start}
            busy={busy}
            error={error}
          >
            <SameScreen disabled={busy} onPlay={playSameScreen} />
          </StartScreen>
          {asking && event && (
            <DailyEventDialog event={event} mission={getScenario(eventMission(asking, event).scenarioId)?.title}
              onStart={() => { setAsking(null); flyDaily(asking, event) }} onCancel={() => setAsking(null)} />
          )}
        </>
      )}
    </div>
  )
}

/** Under the Start screen's menu, on its background: the no-network way to play together, which ui/start has no mode for. */
function SameScreen({ disabled, onPlay }: { disabled: boolean; onPlay: (config: Config) => void }) {
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.scenario_id ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const config = getScenario(scenarioId, difficulty)
    if (config) onPlay(config)
  }
  return (
    <form className="app-same-screen" onSubmit={submit} aria-labelledby="app-same-screen-title">
      <div className="game-panel">
        <div>
          <h2 id="app-same-screen-title">One screen, whole crew</h2>
          <p className="game-muted">No network needed. Everyone shares this device and every role’s controls are open.</p>
        </div>
        <label>
          Mission
          <select className="game-field" value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} disabled={disabled}>
            {scenarios.map((scenario) => (
              <option key={scenario.scenario_id} value={scenario.scenario_id}>
                {scenario.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select className="game-field" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} disabled={disabled}>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {DIFFICULTIES[level].label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="game-button" disabled={disabled || scenarioId === ''}>
          Play on one screen
        </button>
      </div>
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
export function Room({ active, onExit, onCampaignNext }: { active: Active; onExit: () => void; onCampaignNext?: (id: string) => void }) {
  const { session, roomCode } = active
  const { stage, notice, state, players, me } = useSession(session)
  /** Each player reads the briefing on their own screen and goes on when they are ready. */
  const [briefed, setBriefed] = useState(false)
  // A guest learns the scenario from the host's state.
  const scenario = SCENARIOS.find((scenario) => scenario.scenario_id === state.scenario_id)
  // An event daily flies with its event's params, so the what-if reruns (here and in app/World.tsx) fly the same mission.
  const event = active.daily?.event
  const config = useMemo(() => scenario && withEvent(scenario, event), [scenario, event])
  const briefing = !briefed && state.metrics.phase === 'design'
  useScreen(
    stage === 'lobby' || stage === 'closed' ? stage : briefing ? 'briefing' : 'game',
    stage === 'lobby' ? 'Crew lobby' : stage === 'closed' ? 'Room closed' : !config ? 'Unknown mission' : briefing ? `Briefing · ${config.title}` : undefined,
  )

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
  if (!config) {
    return (
      <Closed
        title="Unknown mission"
        text="This room is playing a mission this version of the game does not have. Reload the page and join again."
        onExit={onExit}
      />
    )
  }
  // Decision 007: the game is first-person 3D (app/World.tsx). ?world=classic, the Classic view button or no WebGL: these 2D screens.
  if (WORLD_3D) return <World active={active} config={config} onExit={onExit} onCampaignNext={onCampaignNext} />
  // shortcut: the WalkTo lines below do nothing without the old walk-behind-the-screens hall (removed: it hid each screen for up to 2.4 s and drew a second 3D scene); delete them once nobody needs classic's history.
  return (
    <>
      {/* Someone who joins after launch goes straight to the flight. */}
      {briefing ? (
        <>
          <WalkTo screen="briefing" />
          <Briefing config={config} onStart={() => setBriefed(true)} onBack={onExit} />
          <StoryLayer screen="briefing" scenarioId={state.scenario_id} />
        </>
      ) : (
        <GameScreen session={session} config={config} onExit={onExit} roomCode={roomCode} daily={active.daily} campaign={!!active.campaign} />
      )}
    </>
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
  daily?: DailyPlay
  /** Switching from the 3D room after watching this flight's launch. */
  skipLaunch?: boolean
  /** Switch back to the walkable game. Omitted when the page itself loaded as classic. */
  onFirstPerson?: () => void
  /** The classic launch finished, so going back to first person does not play it again. */
  onLaunchDone?: () => void
  /** A guided campaign mission: "What went wrong" leads back to the mission board. */
  campaign?: boolean
}

/** The builder while the mission is being designed, the flight once it has launched. */
export function GameScreen({ session, config, onExit, roomCode, daily, skipLaunch = false, onFirstPerson, onLaunchDone, campaign = false }: GameScreenProps) {
  const snapshot = useSession(session)
  const { state, notice, players, me } = snapshot
  const designing = state.metrics.phase === 'design'
  useScreen(designing ? 'design' : 'flight')
  // The builder has its own h1; the flight and the results have none, so the bar's title is theirs.
  const Title = designing ? 'span' : 'h1'
  const backToBuilder = () => session.send({ type: 'reset', payload: {} })

  return (
    <div {...(designing ? { className: 'app-page' } : DARK_ONLY)}>
      <header className="app-bar">
        <Title className="app-bar-title">{config.title}</Title>
        {roomCode && (
          <details className="app-crew-menu">
            <summary className="game-button app-small">
              Crew ({players.length})<span className="app-crew-mine"> · {me.role ? ROLE_LABELS[me.role] : 'No role'}</span>
            </summary>
            <div className="app-crew-panel">
              <RoomCode code={roomCode} />
              <Crew session={session} snapshot={snapshot} />
            </div>
          </details>
        )}
        <SoundToggle className="app-small" />
        {onFirstPerson && (
          <button type="button" className="game-button app-small" onClick={onFirstPerson}>
            First person
          </button>
        )}
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
          <main>
            <Flight session={session} config={config} daily={daily} online={roomCode != null} skipLaunch={skipLaunch} onLaunchDone={onLaunchDone} campaign={campaign} onExit={onExit} />
          </main>
        )}
      </ErrorBoundary>
    </div>
  )
}

/** The screen that last took focus. null until the page has shown its first one: loading the page must not move focus. */
let lastScreen: string | null = null

/**
 * Every new screen starts at the top of the page (the old scroll position carried over), names
 * itself in the tab title, and puts focus on its heading, so keyboard and screen-reader players
 * are told the screen changed and Tab starts from its top. Pass `title` only from the component
 * that decides the screen: '' is the bare game name.
 */
function useScreen(screen: string, title?: string) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    if (title !== undefined) document.title = title ? `${title} · ${GAME_NAME}` : GAME_NAME
    const heading = document.querySelector<HTMLElement>('main h1') ?? document.querySelector<HTMLElement>('main h2')
    // Compared by name, so React's double run of effects in development does not count as a change.
    if (lastScreen !== null && lastScreen !== screen && heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
    lastScreen = screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])
}

type SpaceWeatherData = typeof import('../data/space-weather')
let weatherData: SpaceWeatherData | null = null
/** 340 kB of real NASA data. Asked for while the mission is designed, so the flight has its weather strip from the first frame. */
const loadWeather = () => import('../data/space-weather').then((data) => (weatherData = data), () => null)

/** The design phase: the builder with save-and-share under it, then the GO / NO-GO poll before launch. */
function Design({ session, config }: { session: Session; config: Config }) {
  const { state, players, me } = useSession(session)
  const chance = useChance(config, state.params, !state.issues.some((i) => i.severity === 'error'))
  /** The builder's Launch button opens the poll; the poll's Launch button sends the command. */
  const [polling, setPolling] = useState(false)
  useScreen(polling ? 'poll' : 'builder', `${polling ? 'GO / NO-GO poll' : 'Builder'} · ${config.title}`)
  useEffect(() => void loadWeather(), [])

  if (polling) {
    return (
      <main className="app-poll">
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
    <main>
      <WalkTo screen="design" />
      {/* ui/tutorial's panel has no margin of its own: line it up with the builder under it. */}
      <div className="app-tips">
        <BuilderTutorial />
      </div>
      <StoryLayer screen="design" scenarioId={state.scenario_id} />
      <MissionBuilder
        state={state}
        send={(command) => (command.type === 'launch' ? setPolling(true) : session.send(command))}
        players={players}
        me={me}
        chance={chance}
      />
      <div className="app-anyway">
        <LaunchAnyway issues={state.issues} disabled={!commandAccess({ type: 'launch', payload: {} }, players, me).canEdit}
          onLaunch={() => session.send({ type: 'launch', payload: { override: true } })} />
      </div>
      <section className="app-share" aria-labelledby="app-share-title">
        <h2 id="app-share-title">Save, share and compare designs</h2>
        <SharePanel state={state} send={session.send} />
      </section>
    </main>
  )
}

/**
 * The launch cinematic from ui/scene3d (decision 005's launch cutscene), shown after every
 * successful launch, between the poll and the mission screen, until it calls `onDone` (it has
 * its own Skip). Set this to null and the game goes straight to the mission screen.
 */
const LaunchView = SceneLaunchView as ComponentType<{ state: SimState; onDone: () => void; failed?: boolean; cause?: string }> | null
/** The story layer's plain launch cutscene is not played on top of the real one. */
const SHOWN_BY_APP = ['launch']
/** Survey: fly to a place on Earth, then float above that ground. Loaded only when the player opens it. */
const Training = lazy(() => import('./Training'))
/** Live Earth: the real planet right now, from open NASA, NOAA and CelesTrak feeds (ui/live). Loaded only when the player opens it. */
const LiveEarth = lazy(() => import('../ui/live/LiveEarth'))

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

/** Everything after launch: (the launch sequence,) cruise and operations, then the results with the personal best. */
function Flight({ session, config, daily, online, skipLaunch, onLaunchDone, campaign = false, onExit }: { session: Session; config: Config; daily?: DailyPlay; online?: boolean; skipLaunch?: boolean; onLaunchDone?: () => void; campaign?: boolean; onExit: () => void }) {
  const { state, events, paused, speed, players, me } = useSession(session)
  // A late joiner, a reload, or a switch from the walkable game lands mid-mission: no launch to watch.
  const [launchDone, setLaunchDone] = useState(() => skipLaunch || session.getSnapshot().state.t_s > 86400)
  const [weather, setWeather] = useState(weatherData)
  useEffect(() => {
    if (LaunchView && !launchDone) holdClock(true) // nothing flies unseen during the launch
    if (!weather) void loadWeather().then(setWeather) // a late joiner never saw the builder
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const ended = state.status === 'ended'
  // Lost after a "Launch anyway": its launch plays even when the mission ended at once, then "What went wrong".
  const fault = ended ? String(state.metrics.fault ?? '') : ''
  const [wrongClosed, setWrongClosed] = useState(false)
  useScreen(ended ? 'results' : 'flight', `${ended ? 'Results' : 'Flight'} · ${config.title}`)
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
  // Flight training takes the mission screen's place while it is open. Solo, the clock waits for it like for a cutscene.
  const [training, setTraining] = useState(false)
  /** Set on the way out, so the keyboard focus goes back to the button that opened it. */
  const leftTraining = useRef(false)
  const showTraining = (open: boolean) => {
    setTraining(open)
    holdClock(open)
    leftTraining.current = !open
  }
  const focusAfterTraining = (button: HTMLButtonElement | null) => {
    if (!button || !leftTraining.current) return
    leftTraining.current = false
    button.focus()
  }
  // Live Earth lies over the mission screen; the clock waits for it the same way.
  const [live, setLive] = useState(false)
  const showLive = (open: boolean) => {
    setLive(open)
    holdClock(open)
  }
  // Online the mission runs on under the training: an anomaly card or the end of the mission brings the player back.
  const canTrain = !ended && !pendingDecision(state)
  useEffect(() => {
    if (training && !canTrain) showTraining(false)
    if (live && !canTrain) showLive(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [training, live, canTrain])
  // "What would have fixed it": the flown mission rerun with every single change, once, when it ends,
  // answering each anomaly card the way the player did.
  const fixes = useMemo(
    () => (ended ? whatIf({ ...withCards(config), seed: daily?.seed ?? config.seed }, getDatasets(config.datasets), state.params, choicesOf(events)) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ended],
  )

  if (LaunchView && !launchDone && (!ended || fault)) {
    const done = () => {
      holdClock(false)
      setLaunchDone(true)
      onLaunchDone?.()
    }
    return (
      <>
        <WalkTo screen="launch" />
        <LaunchView state={state} onDone={done} failed={state.metrics.outcome === 'launch_failure' && fault !== ''} cause={launchCause(fault)} />
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
  if (training && canTrain) {
    return (
      <>
        <WalkTo screen="flight" />
        <Suspense fallback={<p className="app-training-loading" aria-busy="true">Loading flight training…</p>}>
          <Training
            state={state}
            onClose={() => showTraining(false)}
            survey={online ? {
              host: me.is_host,
              seat: Math.max(0, players.findIndex((p) => p.player_id === me.player_id)),
              report: session.reportSurvey,
              subscribe: session.subscribeSurvey,
            } : undefined}
          />
        </Suspense>
        {/* The same key as below keeps it mounted, so the story does not start over when the player comes back. */}
        <StoryLayer key="story" screen="flight" events={events} scenarioId={state.scenario_id} design={state} onCutscene={holdClock} shown={SHOWN_BY_APP} />
      </>
    )
  }
  return (
    <>
      <WalkTo screen={ended ? 'results' : 'flight'} />
      {canTrain && (
        <aside className={live ? 'app-training-entry app-live-open' : 'app-training-entry'} aria-label="Survey the planet">
          <button type="button" className="game-button" ref={focusAfterTraining} onClick={() => showTraining(true)}>
            Survey the planet
          </button>
          <span className="game-muted">
            Fly to a place, then float above that ground. No score, and the mission {online ? 'keeps running' : 'waits for you'}.
          </span>
          <button type="button" className="game-button" onClick={() => showLive(true)}>Live Earth</button>
          {live && <Suspense fallback={null}><LiveEarth onClose={() => showLive(false)} /></Suspense>}
        </aside>
      )}
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
        // An event daily flies today's real event, not the seed's historical weather.
        spaceWeather={weather && typeof day === 'number' && !daily?.event ? weather.weatherForMissionDay(weatherStart(config, daily?.seed ?? config.seed), day) : null}
      />
      {summary && typeof summary.score === 'number' && !fault && (
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
      <StoryLayer key="story" screen="flight" events={events} scenarioId={state.scenario_id} design={state} onCutscene={holdClock} shown={fault ? [...SHOWN_BY_APP, 'ending-loss'] : SHOWN_BY_APP} />
      {fault && !wrongClosed && <WhatWentWrong state={state} campaign={campaign} onTryAgain={() => tryAgain(session.send, state.params)}
        onExit={onExit} onBack={() => setWrongClosed(true)} />}
    </>
  )
}
