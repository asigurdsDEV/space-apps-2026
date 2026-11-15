/** Lobby authority only. Game envelopes and role-to-command policy come from shared/. */
export interface RoomPlayer<Role extends string> {
  player_id: string
  name: string
  role: Role | null
  is_host: boolean
}
export type RoomResult = { ok: true } | { ok: false; reason: string }

/** Call with connection identities, never with a player_id supplied by a guest. */
export class HostRoom<Role extends string, Command> {
  private members = new Map<string, RoomPlayer<Role>>()
  private ended = false
  constructor(
    readonly hostId: string,
    hostName: string,
    private roles: readonly Role[],
    private allowed: (role: Role | null, command: Command, isHost: boolean, playerId: string) => boolean,
  ) {
    this.members.set(hostId, { player_id: hostId, name: this.name(hostName), role: null, is_host: true })
  }
  get players(): RoomPlayer<Role>[] { return [...this.members.values()].map(player => ({ ...player })) }
  private name(value: string): string { return value.trim().slice(0, 40) || 'Player' }
  join(from: string, name: string): RoomResult {
    if (this.ended) return { ok: false, reason: 'Room has ended' }
    if (this.members.has(from)) return { ok: false, reason: 'Player already joined' }
    if (this.members.size >= 4) return { ok: false, reason: 'Room is full' }
    if (!from) return { ok: false, reason: 'Missing connection identity' }
    this.members.set(from, { player_id: from, name: this.name(name), role: null, is_host: false })
    return { ok: true }
  }
  claimRole(from: string, role: Role | null): RoomResult {
    if (this.ended) return { ok: false, reason: 'Room has ended' }
    const player = this.members.get(from)
    if (!player) return { ok: false, reason: 'Join before choosing a role' }
    if (role !== null && !this.roles.includes(role)) return { ok: false, reason: 'Unknown role' }
    if (role !== null && [...this.members.values()].some(member => member.player_id !== from && member.role === role)) {
      return { ok: false, reason: 'Role is already taken' }
    }
    player.role = role
    return { ok: true }
  }
  authorize(from: string, command: Command): RoomResult {
    if (this.ended) return { ok: false, reason: 'Room has ended' }
    const player = this.members.get(from)
    if (!player) return { ok: false, reason: 'Join before sending commands' }
    return this.allowed(player.role, command, player.is_host, player.player_id)
      ? { ok: true } : { ok: false, reason: 'Your role cannot send that command' }
  }
  leave(from: string): void {
    if (from === this.hostId) { this.ended = true; this.members.clear() }
    else this.members.delete(from)
  }
}
