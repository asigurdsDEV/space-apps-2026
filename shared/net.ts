// Multiplayer shapes from .agents/CONTRACTS.md ("Multiplayer"): players, roles, the
// NetMessage envelope that crosses net/, and who may send which Command.
// Decision 002: host-authoritative co-op for up to 4. Only the host runs the sim.

import type { Command, SimEvent, SimState } from './types'

/** Assigned by net/ (the PeerJS peer id, or a local id). Stable for the session. */
export type PlayerId = string

export const MAX_PLAYERS = 4

export const ROLES = ['mission-planning', 'spacecraft', 'science', 'comms-resources'] as const
export type Role = (typeof ROLES)[number]

export interface Player {
  player_id: PlayerId
  name: string
  /** null until the player claims a role. */
  role: Role | null
  is_host: boolean
}

/**
 * Everything that crosses net/. The sender is NOT inside the message: the transport
 * reports who it came from, and the host looks up that player's role in its own roster.
 * Never trust a role or player id that a guest puts in a payload.
 */
export type NetMessage =
  // guest -> host
  | { type: 'join'; payload: { name: string } }
  | { type: 'claim_role'; payload: { role: Role | null } }
  | { type: 'command'; payload: { command: Command } }
  | { type: 'leave'; payload: Record<string, never> }
  // host -> everyone
  | { type: 'roster'; payload: { players: Player[] } }
  | { type: 'state'; payload: { state: SimState; events: SimEvent[] } }
  | { type: 'rejected'; payload: { player_id: PlayerId; reason: string; command?: Command } }
  | { type: 'ended'; payload: Record<string, never> }

export type NetMessageType = NetMessage['type']

/**
 * Which role owns each design choice (`set_param` key). These are the only keys a host accepts
 * (see isDesignKey). `solar`, `battery` and `comms` are the keys data/ and sim/ use; `power`,
 * `power_system` and `comms_system` are aliases the sim still takes.
 */
export const ROLE_PARAM_KEYS: Record<Role, readonly string[]> = {
  'mission-planning': ['orbit', 'launch_vehicle', 'spacecraft_name'],
  spacecraft: ['bus', 'solar', 'battery', 'power', 'power_system'],
  science: ['instruments'],
  'comms-resources': ['comms', 'comms_system', 'ground_stations'],
}

/** Is `key` a design choice some role owns? Scenario settings such as `budget_usd` are not: players cannot change them. */
export function isDesignKey(key: string): boolean {
  return ROLES.some((role) => ROLE_PARAM_KEYS[role].includes(key))
}

/**
 * The role that owns a command, or null when anyone may send it.
 * Mission planning owns launch, pause/resume, speed and reset.
 */
export function ownerRole(command: Command, decisionConsole?: Role | null): Role | null {
  if (command.type === 'select_entity') return null
  // An anomaly card belongs to its console; pass `state.metrics.decision_console`. Unknown = anyone.
  if (command.type === 'resolve_decision') return decisionConsole ?? null
  if (command.type !== 'set_param') return 'mission-planning'
  for (const role of ROLES) {
    if (ROLE_PARAM_KEYS[role].includes(command.payload.key)) return role
  }
  return 'mission-planning'
}

/**
 * May a player with `role` send `command`? Yes if they hold the owning role, or if
 * nobody in the room holds it (so 1 to 3 players can still fly a whole mission).
 * `claimedRoles` is every role currently taken in the roster.
 */
export function canSend(
  role: Role | null,
  command: Command,
  claimedRoles: readonly (Role | null)[],
  decisionConsole?: Role | null,
): boolean {
  const owner = ownerRole(command, decisionConsole)
  if (owner === null) return true
  return role === owner || !claimedRoles.includes(owner)
}

// ------------------------------------------------------------ Runtime validators
// Everything that arrives over net/ is untrusted. These check the whole shape and never throw.

const MAX_NAME_LENGTH = 80
const MAX_KEY_LENGTH = 64
/**
 * Longest `set_param` text value: room for a list of part ids. The sim repeats the value in
 * issue and warning texts, which must stay under MAX_TEXT_LENGTH or the host's own `state`
 * message would be refused.
 */
export const MAX_PARAM_TEXT_LENGTH = 200
const MAX_TEXT_LENGTH = 2000

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown, max = MAX_TEXT_LENGTH): v is string => typeof v === 'string' && v.length <= max
const isEmpty = (v: unknown): boolean => isObj(v) && Object.keys(v).length === 0
const isParamValue = (v: unknown): boolean => isNum(v) || isStr(v) || typeof v === 'boolean'
const isRole = (v: unknown): v is Role => (ROLES as readonly unknown[]).includes(v)
const isList = (v: unknown, item: (x: unknown) => boolean): boolean => Array.isArray(v) && v.every((x) => item(x))
const isRecord = (v: unknown, value: (x: unknown) => boolean): boolean =>
  isObj(v) && Object.values(v).every((x) => value(x))
const isVec3 = (v: unknown): boolean => Array.isArray(v) && v.length === 3 && v.every(isNum)
/** A missing optional field is `undefined` before JSON and absent after it. */
const optional = (v: unknown, check: (x: unknown) => boolean): boolean => v === undefined || check(v)

function commandOk(v: unknown): boolean {
  if (!isObj(v)) return false
  const p = v.payload
  switch (v.type) {
    case 'pause':
    case 'resume':
    case 'reset':
    case 'launch':
      return isEmpty(p)
    case 'set_speed':
      return isObj(p) && isNum(p.multiplier)
    case 'set_param':
      return (
        isObj(p) &&
        isStr(p.key, MAX_KEY_LENGTH) &&
        p.key !== '' &&
        (isNum(p.value) || typeof p.value === 'boolean' || isStr(p.value, MAX_PARAM_TEXT_LENGTH))
      )
    case 'select_entity':
      return isObj(p) && (p.id === null || isStr(p.id, MAX_KEY_LENGTH))
    case 'resolve_decision':
      return isObj(p) && isStr(p.decision_id, MAX_KEY_LENGTH) && isStr(p.option_id, MAX_KEY_LENGTH)
    default:
      return false
  }
}

const entityOk = (v: unknown): boolean =>
  isObj(v) &&
  isStr(v.id) &&
  isStr(v.kind) &&
  isStr(v.name) &&
  optional(v.position, isVec3) &&
  optional(v.velocity, isVec3) &&
  isRecord(v.props, isParamValue)

const issueOk = (v: unknown): boolean =>
  isObj(v) &&
  isStr(v.code) &&
  (v.severity === 'error' || v.severity === 'warning') &&
  isStr(v.resource) &&
  isStr(v.message)

const stateOk = (v: unknown): boolean =>
  isObj(v) &&
  isStr(v.contract_version) &&
  isStr(v.scenario_id) &&
  isNum(v.tick) &&
  isNum(v.t_s) &&
  isStr(v.utc) &&
  isStr(v.frame) &&
  (v.status === 'running' || v.status === 'paused' || v.status === 'ended') &&
  isList(v.entities, entityOk) &&
  isRecord(v.metrics, (m) => m === undefined || isNum(m) || isStr(m)) &&
  isRecord(v.params, isParamValue) &&
  isList(v.issues, issueOk) &&
  isNum(v.rng_state)

function eventPayloadOk(type: unknown, p: Obj): boolean {
  switch (type) {
    case 'scenario_started':
      return isStr(p.scenario_id)
    case 'entity_added':
      return entityOk(p.entity)
    case 'entity_removed':
      return isStr(p.id) && isStr(p.reason)
    case 'threshold_crossed':
      return isStr(p.metric) && isNum(p.value) && isNum(p.threshold) && (p.direction === 'up' || p.direction === 'down')
    case 'phase_changed':
      return isStr(p.from) && isStr(p.to)
    case 'scenario_ended':
      return isStr(p.reason) && isRecord(p.summary, (s) => isNum(s) || isStr(s))
    case 'warning':
      return isStr(p.message)
    case 'decision_required':
      return (
        isStr(p.decision_id, MAX_KEY_LENGTH) &&
        isStr(p.card_id, MAX_KEY_LENGTH) &&
        isStr(p.title) &&
        isStr(p.body) &&
        isRole(p.console) &&
        isList(p.options, (o) => isObj(o) && isStr(o.id, MAX_KEY_LENGTH) && isStr(o.label) && isStr(o.effect_text)) &&
        optional(p.story, (s) => isObj(s) && isStr(s.mission) && (isNum(s.year) || isStr(s.year)) && isStr(s.text) && optional(s.source_url, (u) => isStr(u)))
      )
    case 'decision_resolved':
      return isStr(p.decision_id, MAX_KEY_LENGTH) && isStr(p.card_id, MAX_KEY_LENGTH) && isStr(p.option_id, MAX_KEY_LENGTH) && isStr(p.message)
    default:
      return false
  }
}

const eventOk = (v: unknown): boolean =>
  isObj(v) && isNum(v.tick) && isNum(v.t_s) && isObj(v.payload) && eventPayloadOk(v.type, v.payload)

const playerOk = (v: unknown): boolean =>
  isObj(v) &&
  isStr(v.player_id, MAX_NAME_LENGTH) &&
  v.player_id !== '' &&
  isStr(v.name, MAX_NAME_LENGTH) &&
  (v.role === null || isRole(v.role)) &&
  typeof v.is_host === 'boolean'

function messageOk(v: unknown): boolean {
  if (!isObj(v)) return false
  const p = v.payload
  switch (v.type) {
    case 'join':
      return isObj(p) && isStr(p.name, MAX_NAME_LENGTH)
    case 'claim_role':
      return isObj(p) && (p.role === null || isRole(p.role))
    case 'command':
      return isObj(p) && commandOk(p.command)
    case 'leave':
    case 'ended':
      return isEmpty(p)
    case 'roster':
      return isObj(p) && isList(p.players, playerOk) && (p.players as unknown[]).length <= MAX_PLAYERS
    case 'state':
      return isObj(p) && stateOk(p.state) && isList(p.events, eventOk)
    case 'rejected':
      return isObj(p) && isStr(p.player_id, MAX_NAME_LENGTH) && isStr(p.reason) && optional(p.command, commandOk)
    default:
      return false
  }
}

/** Is `value` a well-formed Command? Unknown types, wrong payloads and non-finite numbers are refused. Never throws. */
export function isCommand(value: unknown): value is Command {
  try {
    return commandOk(value)
  } catch {
    return false
  }
}

/** Is `value` a well-formed NetMessage? Never throws. Pass it to net/'s PeerTransport as `validate`. */
export function isNetMessage(value: unknown): value is NetMessage {
  try {
    return messageOk(value)
  } catch {
    return false
  }
}
