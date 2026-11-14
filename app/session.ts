// The seam between the React screens and whatever runs the game.
// Screens depend only on `Session`: a solo game in this browser, a co-op host, or a co-op
// guest (net/ + shared/net.ts). All three implement the same interface.

import { HostRoom, type Transport } from '../net'
import type { Command, Entity, NetMessage, Player, Role, SimEvent, SimState } from '../shared'
import { canSend, CONTRACT_VERSION, isDesignKey, isNetMessage, ownerRole, ROLES } from '../shared'
import type { Game, GameSnapshot } from './game'

export interface SessionSnapshot {
  readonly state: SimState
  /** Every SimEvent so far, oldest first. */
  readonly events: readonly SimEvent[]
  readonly paused: boolean
  readonly speed: number
  /** Everyone in the room, host first. Solo: just `me`. */
  readonly players: Player[]
  readonly me: Player
  /** One short message for this player, e.g. why a command was refused. null when there is none. */
  readonly notice: string | null
  /**
   * `lobby`: the crew is gathering and picking roles; a guest's `state` is a placeholder until the host starts.
   * `playing`: draw `state`. `closed`: the room is gone (`notice` says why). Solo is always `playing`.
   */
  readonly stage: 'lobby' | 'playing' | 'closed'
}

export interface Session {
  /** The same object until something changes, so it works with useSyncExternalStore. */
  getSnapshot(): SessionSnapshot
  /** Calls `listener` after every change. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void
  /** Solo and host: runs the command. Guest: sends it to the host. */
  send(command: Command): void
  /** Clear `notice`. */
  dismissNotice(): void
  /** Co-op only: take a free role, or null to give yours up. */
  claimRole?(role: Role | null): void
  /** Host only: leave the lobby and begin designing the mission. */
  start?(): void
  /** Stop timers and connections. The session must not be used afterwards. */
  close(): void
}

export interface SoloSessionOptions {
  /** Display name of the one player. */
  name?: string
  /**
   * Starts whatever calls game.advance and returns its stop function, e.g. `startDriver`
   * from app/driver.ts. It runs until close(). Leave it out to call game.advance yourself (tests).
   */
  drive?: (game: Game) => () => void
}

export const SOLO_PLAYER_ID = 'solo'

/** The message of the latest warning in `after` that was not in `before`, or null. */
function newWarning(before: readonly SimEvent[], after: readonly SimEvent[]): string | null {
  for (let i = after.length - 1; i >= 0; i--) {
    const event = after[i]
    if (before.includes(event)) return null
    if (event.type === 'warning') return event.payload.message
  }
  return null
}

/** One player, in this browser, holding no role (so `canSend` lets them send everything). No net/ involved. */
export function createSoloSession(game: Game, options: SoloSessionOptions = {}): Session {
  const me: Player = { player_id: SOLO_PLAYER_ID, name: options.name ?? 'You', role: null, is_host: true }
  const players = [me]
  const listeners = new Set<() => void>()
  let notice: string | null = null
  let base = game.getSnapshot()
  let snapshot = build(base)
  let sending = false
  let closed = false

  function build(from: GameSnapshot): SessionSnapshot {
    return { ...from, players, me, notice, stage: 'playing' }
  }

  function emit(): void {
    for (const listener of [...listeners]) listener()
  }

  // While send() runs, it emits once itself, after the notice is settled.
  const stopListening = game.subscribe(() => {
    if (!sending) emit()
  })
  const stopDriving = options.drive?.(game)

  return {
    getSnapshot() {
      const current = game.getSnapshot()
      if (current !== base || snapshot.notice !== notice) {
        base = current
        snapshot = build(current)
      }
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    send(command) {
      if (closed) return
      const before = game.getSnapshot()
      sending = true
      try {
        game.send(command)
      } finally {
        sending = false
      }
      const after = game.getSnapshot()
      // A warning the sim raised in answer to this command (a refused launch) becomes the
      // notice. Any other command clears it.
      const next = newWarning(before.events, after.events)
      const changed = after !== before || next !== notice
      notice = next
      if (changed) emit()
    },
    dismissNotice() {
      if (notice === null) return
      notice = null
      emit()
    },
    close() {
      if (closed) return
      closed = true
      stopDriving?.()
      stopListening()
      listeners.clear()
    },
  }
}

// ------------------------------------------------------------------ Co-op
// Decision 002: only the host runs the sim. Guests send Commands and draw what the host
// broadcasts. Who sent a message comes from the transport's `from`, never from its payload.

/** What the sessions need from net/: LocalTransport and PeerTransport both fit. */
export interface SessionTransport extends Transport<NetMessage> {
  readonly playerId: string
  /** PeerTransport only: the connection ids in the room right now. */
  onPlayers?(handler: (ids: readonly string[]) => void): () => void
  /** PeerTransport only: `error` or `closed` means the room is gone. */
  onStatus?(handler: (status: 'connecting' | 'ready' | 'closed' | 'error', error?: Error) => void): () => void
}

export const ROLE_LABELS: Record<Role, string> = {
  'mission-planning': 'Mission planning',
  spacecraft: 'Spacecraft',
  science: 'Science',
  'comms-resources': 'Comms and resources',
}

/** In flight the host sends `state` at most this often. Design changes and the ending go out at once. */
export const STATE_INTERVAL_MS = 100

/**
 * `state` messages have no field for the app's pause flag or speed, so the host sends them
 * inside the SimState: status `paused`, and this metric.
 */
const SPEED_METRIC = 'speed_multiplier'

// PeerJS refuses a JSON message of 16,300 bytes and net/ then drops the guest, and the real
// scenario's SimState alone is larger than that (its entities hold every catalog row). So a
// `state` message leaves out what the guests already have, and says so in three more metrics:
/** How many `baseline` entities the guest must put back (all those whose id is not in the message). */
const BASE_METRIC = 'base_entities'
/** How many of the events it already holds the guest keeps; the message's events follow them. */
const EVENTS_KEEP_METRIC = 'events_keep'
/** Length of the host's event list after this message. */
const EVENTS_TOTAL_METRIC = 'events_total'

/** Most bytes of events in one `state` message. Older events are left out (late joiners get the newest). */
export const MAX_EVENT_BYTES = 8000

const SEND_FAILED = 'The latest game state could not be sent to the other players. Try “Reset”, or host a new room.'

const ACTIONS: Record<Command['type'], string> = {
  launch: 'launch the mission',
  pause: 'pause the mission',
  resume: 'resume the mission',
  set_speed: 'change the speed',
  reset: 'reset the mission',
  set_param: 'change that part of the design',
  select_entity: 'do that',
  resolve_decision: 'answer this anomaly',
}

/** Why `command` was refused, for the player who sent it. */
function refusal(command: Command, players: readonly Player[], decisionConsole?: Role | null): string {
  const owner = ownerRole(command, decisionConsole)
  const holder = players.find((p) => p.role !== null && p.role === owner)
  if (!owner || !holder) return 'That command was refused.'
  return `Only ${holder.name} (${ROLE_LABELS[owner]}) can ${ACTIONS[command.type]}.`
}

export interface HostSessionOptions {
  /** Same as SoloSessionOptions.drive. */
  drive?: (game: Game) => () => void
  /**
   * Entities every guest already has, e.g. `sim.init(config, datasets).entities` (the parts
   * catalogs). Unchanged ones are left out of `state` messages; guests must be created with
   * the same list. Without it the whole state is sent, which only suits small scenarios.
   */
  baseline?: readonly Entity[]
}

/**
 * The host: runs `game`, keeps the roster (net/'s HostRoom), checks every command against the
 * sender's role and broadcasts the result. Starts in the lobby; no `state` is sent until start().
 * The transport must be ready. With a LocalTransport this is same-screen play.
 */
export function createHostSession(
  game: Game,
  transport: SessionTransport,
  name: string,
  options: HostSessionOptions = {},
): Session {
  const hostId = transport.playerId
  // The policy callback is unused: HostRoom.authorize refuses players with no role, but the
  // contract lets anyone cover an unclaimed role, so commands are checked with canSend below.
  const newRoom = (hostName: string) => new HostRoom<Role, Command>(hostId, hostName, ROLES, () => true)
  const listeners = new Set<() => void>()
  let room = newRoom(name)
  let players: Player[] = room.players
  let stage: SessionSnapshot['stage'] = 'lobby'
  let notice: string | null = null
  /** A notice about the room itself (room lost, state not sent). Stays until dismissed; commands do not clear it. */
  let sticky: string | null = null
  let snapshot = build()
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastSent = -Infinity
  let sentPhase: unknown
  /** The game's event list as of the last `state` message. Empty = the next message starts the guests' list again. */
  let sentEvents: readonly SimEvent[] = []
  const baseline = options.baseline
  const baselineJson = new Map(baseline?.map((entity) => [entity.id, JSON.stringify(entity)]))
  let closed = false

  function build(): SessionSnapshot {
    return { ...game.getSnapshot(), players, me: players[0], notice, stage }
  }

  function refresh(): void {
    snapshot = build()
    for (const listener of [...listeners]) listener()
  }

  /** False when the transport is closing or refused the message. The host's own game carries on. */
  function broadcast(message: NetMessage): boolean {
    try {
      transport.send(message)
      return true
    } catch {
      return false
    }
  }

  function sendState(): void {
    clearTimeout(timer)
    timer = undefined
    lastSent = Date.now()
    const { state, events, paused, speed } = game.getSnapshot()
    sentPhase = state.metrics.phase
    // Events: only those the guests do not hold yet, newest first until the byte budget is spent.
    let keep = 0
    while (keep < sentEvents.length && keep < events.length && sentEvents[keep] === events[keep]) keep++
    let start = events.length
    for (let bytes = 0; start > keep; start--) {
      bytes += JSON.stringify(events[start - 1]).length
      if (bytes > MAX_EVENT_BYTES) break
    }
    // Entities: leave out the baseline ones that have not changed. (If the sim ever removes a
    // baseline entity the whole list goes out, as there is no way to say "removed".)
    const ids = new Set(state.entities.map((entity) => entity.id))
    const compact = baseline !== undefined && baseline.every((entity) => ids.has(entity.id))
    const shown: SimState = {
      ...state,
      status: paused && state.status === 'running' ? 'paused' : state.status,
      entities: compact
        ? state.entities.filter((entity) => baselineJson.get(entity.id) !== JSON.stringify(entity))
        : state.entities,
      metrics: {
        ...state.metrics,
        [SPEED_METRIC]: speed,
        [EVENTS_KEEP_METRIC]: keep,
        [EVENTS_TOTAL_METRIC]: events.length,
        ...(compact ? { [BASE_METRIC]: baseline.length } : {}),
      },
    }
    const message: NetMessage = { type: 'state', payload: { state: shown, events: events.slice(start) } }
    // Checked here too, because not every transport validates: a state the guests would refuse must not pass silently.
    if (isNetMessage(message) && broadcast(message)) {
      sentEvents = events
      if (sticky === SEND_FAILED) setSticky(null)
    } else if (!closed) {
      setSticky(SEND_FAILED)
    }
  }

  function setSticky(text: string | null): void {
    if (notice === sticky) notice = text
    sticky = text
    refresh()
  }

  function scheduleState(): void {
    const { state } = game.getSnapshot()
    // Design edits, a change of phase (launch) and the ending go out at once.
    const { phase } = state.metrics
    const urgent = phase === 'design' || phase !== sentPhase || state.status === 'ended'
    const wait = urgent ? 0 : lastSent + STATE_INTERVAL_MS - Date.now()
    if (wait <= 0) sendState()
    else timer ??= setTimeout(sendState, wait)
  }

  function rosterChanged(): void {
    players = room.players
    broadcast({ type: 'roster', payload: { players } })
    refresh()
  }

  function reject(player_id: string, reason: string, command?: Command): void {
    broadcast({ type: 'rejected', payload: command ? { player_id, reason, command } : { player_id, reason } })
  }

  // HostRoom cannot take a role back, so build a new room with every other seat and role as it was.
  function release(id: string): void {
    const old = room.players
    room = newRoom(old[0].name)
    for (const player of old) {
      if (!player.is_host) room.join(player.player_id, player.name)
      if (player.role && player.player_id !== id) room.claimRole(player.player_id, player.role)
    }
  }

  /** Check the sender's role, then run the command. Returns why it was refused, or null. */
  function attempt(player: Player, command: Command): string | null {
    if (command.type === 'set_param') {
      // The sim stores any key it is given, so scenario settings (the budget) and made-up keys stop here.
      if (!isDesignKey(command.payload.key)) return 'That is not a part of the design that players can change.'
      if (game.getSnapshot().state.metrics.phase !== 'design') return 'The design is locked after launch.'
    }
    // An anomaly card belongs to the console the sim named for it.
    const console = game.getSnapshot().state.metrics.decision_console
    const decisionConsole = ROLES.find((role) => role === console) ?? null
    if (!canSend(player.role, command, players.map((p) => p.role), decisionConsole)) return refusal(command, players, decisionConsole)
    const before = game.getSnapshot().events
    game.send(command)
    // A warning the sim raised in answer (a refused launch) goes back to whoever sent the command.
    return newWarning(before, game.getSnapshot().events)
  }

  const stopListening = game.subscribe(() => {
    if (stage === 'playing') scheduleState()
    refresh()
  })

  const stopMessages = transport.onMessage((message, from) => {
    // A LocalTransport hands the host its own broadcasts back, so anything "from" the host is skipped.
    if (closed || from === hostId || !isNetMessage(message)) return
    switch (message.type) {
      case 'join': {
        const result = room.join(from, message.payload.name)
        if (!result.ok) return reject(from, result.reason)
        rosterChanged()
        if (stage === 'playing') {
          sentEvents = [] // the newcomer holds no events yet
          sendState()
        }
        return
      }
      case 'claim_role': {
        const { role } = message.payload
        if (role === null) release(from)
        else {
          const result = room.claimRole(from, role)
          if (!result.ok) return reject(from, result.reason)
        }
        return rosterChanged()
      }
      case 'command': {
        const { command } = message.payload
        if (command.type === 'select_entity') return
        const player = players.find((p) => p.player_id === from)
        const reason = player ? attempt(player, command) : 'Join the room before sending commands.'
        if (reason) reject(from, reason, command)
        return
      }
      case 'leave':
        room.leave(from)
        return rosterChanged()
      // roster, state, rejected and ended only go from the host to guests: ignored here.
    }
  })

  // A guest whose connection dropped without a `leave` message.
  const stopPlayers = transport.onPlayers?.((ids) => {
    const gone = players.filter((p) => !p.is_host && !ids.includes(p.player_id))
    if (closed || gone.length === 0) return
    for (const player of gone) room.leave(player.player_id)
    rosterChanged()
  })

  // net/ treats a lost broker connection as final: every guest is cut off. The host's game goes on.
  const stopStatus = transport.onStatus?.((status, error) => {
    if (closed || (status !== 'error' && status !== 'closed')) return
    for (const player of players) if (!player.is_host) room.leave(player.player_id)
    players = room.players
    setSticky(`The online room was lost (${error?.message ?? 'connection closed'}). You can keep playing on this device.`)
  })

  const stopDriving = options.drive?.(game)

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    send(command) {
      if (closed) return
      notice = attempt(players[0], command) ?? sticky
      refresh()
    },
    dismissNotice() {
      if (notice === null) return
      notice = null
      sticky = null
      refresh()
    },
    claimRole(role) {
      if (closed) return
      notice = sticky
      if (role === null) release(hostId)
      else {
        const result = room.claimRole(hostId, role)
        if (!result.ok) notice = result.reason
      }
      rosterChanged()
    },
    start() {
      if (closed || stage !== 'lobby') return
      stage = 'playing'
      sentEvents = []
      sendState()
      refresh()
    },
    close() {
      if (closed) return
      broadcast({ type: 'ended', payload: {} })
      closed = true
      clearTimeout(timer)
      stopDriving?.()
      stopListening()
      stopMessages()
      stopPlayers?.()
      stopStatus?.()
      listeners.clear()
      // After the current task, so a LocalTransport still delivers `ended`.
      queueMicrotask(() => transport.close())
    },
  }
}

/** What a guest holds before the host's first `state` message. Not drawn: the lobby is on screen until then. */
const WAITING_STATE: SimState = {
  contract_version: CONTRACT_VERSION,
  scenario_id: '',
  tick: 0,
  t_s: 0,
  utc: '',
  frame: '',
  status: 'paused',
  entities: [],
  metrics: { phase: 'design' },
  params: {},
  issues: [],
  rng_state: 0,
}

export interface GuestSessionOptions {
  /** The same list the host was given as HostSessionOptions.baseline. */
  baseline?: readonly Entity[]
}

/**
 * A guest: no Game and no sim. Sends `join`, then shows whatever the host broadcasts and
 * turns send() into `command` messages. The transport must be ready (connected to the host).
 */
export function createGuestSession(transport: SessionTransport, name: string, options: GuestSessionOptions = {}): Session {
  const myId = transport.playerId
  const baseline = options.baseline ?? []
  /** The host's event-list length as of the last `state` message. */
  let eventsTotal = 0
  const listeners = new Set<() => void>()
  let me: Player = { player_id: myId, name, role: null, is_host: false }
  let players: Player[] = []
  /** True once a roster has listed this player. */
  let joined = false
  let state = WAITING_STATE
  let events: readonly SimEvent[] = []
  let paused = false
  let speed = 1
  let stage: SessionSnapshot['stage'] = 'lobby'
  let notice: string | null = null
  let snapshot = build()
  let closed = false

  function build(): SessionSnapshot {
    return { state, events, paused, speed, players, me, notice, stage }
  }

  function refresh(): void {
    snapshot = build()
    for (const listener of [...listeners]) listener()
  }

  function post(message: NetMessage): void {
    try {
      transport.send(message)
    } catch {
      notice = 'Could not reach the host.'
    }
  }

  function roomClosed(reason: string): void {
    stage = 'closed'
    notice = reason
  }

  const stopMessages = transport.onMessage((message, from) => {
    if (closed || stage === 'closed' || from === myId || !isNetMessage(message)) return
    switch (message.type) {
      case 'roster': {
        players = message.payload.players
        const found = players.find((p) => p.player_id === myId)
        if (found) {
          me = found
          joined = true
        }
        break
      }
      case 'state': {
        if (!joined) return
        const sent = message.payload.state
        const { [BASE_METRIC]: base, [EVENTS_KEEP_METRIC]: keep, [EVENTS_TOTAL_METRIC]: total } = sent.metrics
        if (base === undefined) state = sent
        else if (base !== baseline.length) {
          roomClosed('This room is playing a different version of the game. Reload the page and join again.')
          break
        } else {
          const changed = new Map(sent.entities.map((entity) => [entity.id, entity]))
          const merged = baseline.map((entity) => changed.get(entity.id) ?? entity)
          const known = new Set(baseline.map((entity) => entity.id))
          // Same entities as the host's; the order may differ, and nothing reads it.
          state = { ...sent, entities: [...merged, ...sent.entities.filter((entity) => !known.has(entity.id))] }
        }
        if (typeof keep === 'number' && typeof total === 'number') {
          // Drop the events the host has replaced (all of them after a reset), then add the new ones.
          const stale = Math.max(0, eventsTotal - keep)
          events = [...events.slice(0, Math.max(0, events.length - stale)), ...message.payload.events]
          eventsTotal = total
        } else {
          events = message.payload.events
        }
        paused = state.status === 'paused'
        const sentSpeed = state.metrics[SPEED_METRIC]
        speed = typeof sentSpeed === 'number' ? sentSpeed : 1
        stage = 'playing'
        break
      }
      case 'rejected':
        if (message.payload.player_id !== myId) return
        // Refused before ever being listed: the join itself failed (room full).
        if (joined) notice = message.payload.reason
        else roomClosed(message.payload.reason)
        break
      case 'ended':
        roomClosed('The host closed the room.')
        break
      default:
        // join, claim_role, command and leave are for the host.
        return
    }
    refresh()
  })

  const stopStatus = transport.onStatus?.((status, error) => {
    if (closed || stage === 'closed' || (status !== 'error' && status !== 'closed')) return
    roomClosed(error?.message ?? 'The connection to the host was lost.')
    refresh()
  })

  post({ type: 'join', payload: { name } })

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    send(command) {
      // select_entity is local to each player and nothing shows a selection yet.
      if (closed || stage === 'closed' || command.type === 'select_entity') return
      notice = null
      post({ type: 'command', payload: { command } })
      refresh()
    },
    dismissNotice() {
      if (notice === null) return
      notice = null
      refresh()
    },
    claimRole(role) {
      if (closed || stage === 'closed') return
      notice = null
      post({ type: 'claim_role', payload: { role } })
      refresh()
    },
    close() {
      if (closed) return
      if (stage !== 'closed') post({ type: 'leave', payload: {} })
      closed = true
      stopMessages()
      stopStatus?.()
      listeners.clear()
      // After the current task, so a LocalTransport still delivers `leave`.
      queueMicrotask(() => transport.close())
    },
  }
}
