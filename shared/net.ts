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

/** Which role owns each design choice (`set_param` key). Keys not listed belong to mission planning. */
export const ROLE_PARAM_KEYS: Record<Role, readonly string[]> = {
  'mission-planning': ['orbit', 'launch_vehicle', 'spacecraft_name'],
  spacecraft: ['bus', 'power_system'],
  science: ['instruments'],
  'comms-resources': ['comms_system', 'ground_stations'],
}

/**
 * The role that owns a command, or null when anyone may send it.
 * Mission planning owns launch, pause/resume, speed and reset.
 */
export function ownerRole(command: Command): Role | null {
  if (command.type === 'select_entity') return null
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
export function canSend(role: Role | null, command: Command, claimedRoles: readonly (Role | null)[]): boolean {
  const owner = ownerRole(command)
  if (owner === null) return true
  return role === owner || !claimedRoles.includes(owner)
}
