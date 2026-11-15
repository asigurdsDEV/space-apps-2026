import { ROLES, type Command, type NetMessage } from '../shared'
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.length <= 4096
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const role = (v: unknown) => v === null || ROLES.includes(v as typeof ROLES[number])
const flat = (v: unknown) => record(v) && Object.values(v).every(x => text(x) || finite(x) || typeof x === 'boolean')
const vector = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every(finite)
const entity = (v: unknown) => record(v) && text(v.id) && text(v.kind) && text(v.name) && flat(v.props) && (v.position === undefined || vector(v.position)) && (v.velocity === undefined || vector(v.velocity))
const summary = (v: unknown) => record(v) && Object.values(v).every(x => text(x) || finite(x))
export function isCommand(v: unknown): v is Command {
  if (!record(v) || !record(v.payload)) return false
  const p = v.payload
  switch (v.type) {
    case 'pause': case 'resume': case 'reset': case 'launch': return Object.keys(p).length === 0
    case 'set_speed': return finite(p.multiplier) && p.multiplier > 0
    case 'set_param': return text(p.key) && p.key.length > 0 && (text(p.value) || finite(p.value) || typeof p.value === 'boolean')
    case 'select_entity': return p.id === null || text(p.id)
    default: return false
  }
}
function state(v: unknown): boolean {
  if (!record(v)) return false
  return text(v.contract_version) && text(v.scenario_id) && Number.isInteger(v.tick) && Number(v.tick) >= 0 && finite(v.t_s) && text(v.utc) && text(v.frame)
    && ['running', 'paused', 'ended'].includes(String(v.status)) && Array.isArray(v.entities) && v.entities.every(entity)
    && record(v.metrics) && Object.values(v.metrics).every(x => x === undefined || text(x) || finite(x))
    && flat(v.params) && finite(v.rng_state) && Array.isArray(v.issues) && v.issues.every(x => record(x) && text(x.code) && ['error', 'warning'].includes(String(x.severity)) && text(x.resource) && text(x.message))
}
function event(v: unknown): boolean {
  if (!record(v) || !Number.isInteger(v.tick) || Number(v.tick) < 0 || !finite(v.t_s) || !record(v.payload)) return false
  const p = v.payload
  switch (v.type) {
    case 'scenario_started': return text(p.scenario_id)
    case 'entity_added': return entity(p.entity)
    case 'entity_removed': return text(p.id) && text(p.reason)
    case 'threshold_crossed': return text(p.metric) && finite(p.value) && finite(p.threshold) && (p.direction === 'up' || p.direction === 'down')
    case 'phase_changed': return text(p.from) && text(p.to)
    case 'scenario_ended': return text(p.reason) && summary(p.summary)
    case 'warning': return text(p.message)
    default: return false
  }
}
/** Runtime guard for the exact shared envelope; identity is still checked by the session. */
export function isNetMessage(v: unknown): v is NetMessage {
  if (!record(v) || !record(v.payload)) return false
  const p = v.payload
  switch (v.type) {
    case 'join': return text(p.name) && p.name.length <= 40
    case 'claim_role': return role(p.role)
    case 'command': return isCommand(p.command)
    case 'leave': case 'ended': return Object.keys(p).length === 0
    case 'pose': return finite(p.x) && finite(p.z) && finite(p.yaw) && Math.abs(p.x) <= 40 && Math.abs(p.z) <= 40 && Math.abs(p.yaw) <= Math.PI + 0.01 && (p.player_id === undefined || (text(p.player_id) && p.player_id.length > 0 && p.player_id.length <= 80))
    case 'roster': return Array.isArray(p.players) && p.players.length <= 4 && p.players.every(x => record(x) && text(x.player_id) && text(x.name) && role(x.role) && typeof x.is_host === 'boolean')
    case 'state': return state(p.state) && Array.isArray(p.events) && p.events.every(event)
    case 'rejected': return text(p.player_id) && text(p.reason) && (p.command === undefined || isCommand(p.command))
    default: return false
  }
}
