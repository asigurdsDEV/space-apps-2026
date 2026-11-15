import { ROLES, canSend, type Command, type NetMessage, type Player, type Role } from '../shared'
import { HostRoom } from './room'
import { PeerTransport } from './peer-transport'
import { LocalTransport, type MessageHandler, type Transport } from './transport'
import { isNetMessage } from './validate'

export interface Room {
  code: string | null
  readonly self: Player
  transport: Transport<NetMessage>
  close(): void
}
const guestTypes = new Set(['join', 'claim_role', 'command', 'leave'])
const hostTypes = new Set(['roster', 'state', 'rejected', 'ended'])

/** Concrete shared-protocol router; exported so integration can inject a transport. */
export function createRoomSession(raw: Transport<NetMessage>, id: string, name: string, code: string | null, hostId = id): Room {
  const isHost = id === hostId
  let self: Player = { player_id: id, name: name.trim().slice(0, 40) || 'Player', role: null, is_host: isHost }
  let roster: Player[] = isHost ? [self] : []
  let closed = false
  const handlers = new Set<MessageHandler<NetMessage>>()
  const emit = (message: NetMessage, from: string) => { for (const handler of handlers) handler(message, from) }
  const lobby: HostRoom<Role, Command> = new HostRoom<Role, Command>(id, self.name, ROLES, (_role, command, _isHost, playerId) => canSend(lobby.players, playerId, command))
  function publishRoster() {
    roster = lobby.players
    self = roster.find(player => player.player_id === id) ?? self
    const message: NetMessage = { type: 'roster', payload: { players: roster } }
    raw.send(message); emit(message, id)
  }
  function reject(from: string, reason: string) {
    const message: NetMessage = { type: 'rejected', payload: { player_id: from, reason } }
    raw.send(message); emit(message, id)
  }
  function receive(message: NetMessage, from: string) {
    if (closed || !isNetMessage(message)) return
    if (isHost) {
      if (!guestTypes.has(message.type)) return
      if (message.type === 'join') {
        const result = lobby.join(from, message.payload.name)
        if (!result.ok) reject(from, result.reason)
        else publishRoster()
      } else if (message.type === 'claim_role') {
        const result = lobby.claimRole(from, message.payload.role)
        if (!result.ok) reject(from, result.reason)
        else publishRoster()
      } else if (message.type === 'leave') {
        if (from !== id) { lobby.leave(from); publishRoster() }
      } else if (message.type === 'command') {
        const result = lobby.authorize(from, message.payload.command)
        if (!result.ok) reject(from, result.reason)
        else emit(message, from)
      }
    } else {
      if (from !== hostId || !hostTypes.has(message.type)) return
      if (message.type === 'roster') {
        roster = message.payload.players
        self = roster.find(player => player.player_id === id) ?? self
      }
      emit(message, from)
    }
  }
  const unsubscribe = raw.onMessage(receive)
  // Connection loss releases roles even when a guest cannot send leave.
  const unplayers = raw instanceof PeerTransport && isHost ? raw.onPlayers(ids => {
    let changed = false
    for (const player of lobby.players) if (!player.is_host && !ids.includes(player.player_id)) { lobby.leave(player.player_id); changed = true }
    if (changed) publishRoster()
  }) : () => {}
  const transport: Transport<NetMessage> = {
    send(message) {
      if (closed) throw new Error('Room is closed')
      if (!isNetMessage(message)) throw new Error('Invalid message')
      if (isHost) {
        if (guestTypes.has(message.type)) receive(message, id)
        else if (hostTypes.has(message.type)) { raw.send(message); emit(message, id) }
      } else if (guestTypes.has(message.type)) raw.send(message)
      else throw new Error('Only host may send state or roster')
    },
    onMessage(handler) {
      handlers.add(handler)
      queueMicrotask(() => { if (!closed && handlers.has(handler) && roster.length) handler({ type: 'roster', payload: { players: roster } }, hostId) })
      return () => { handlers.delete(handler) }
    },
    close() { room.close() },
  }
  const room: Room = {
    code, get self() { return { ...self } }, transport,
    close() {
      if (closed) return
      try { raw.send(isHost ? { type: 'ended', payload: {} } : { type: 'leave', payload: {} }) } catch { /* Already disconnected. */ }
      closed = true; unsubscribe(); unplayers(); handlers.clear(); raw.close()
    },
  }
  if (!isHost) raw.send({ type: 'join', payload: { name: self.name } })
  return room
}

export function createLocalRoom(name: string): Room {
  return createRoomSession(new LocalTransport<NetMessage>(), 'local', name, null)
}
export async function hostRoom(name: string): Promise<Room> {
  const { default: Peer } = await import('peerjs')
  const raw = new PeerTransport<NetMessage>(new Peer(), { validate: isNetMessage })
  const id = await raw.ready
  return createRoomSession(raw, id, name, id)
}
export async function joinRoom(code: string, name: string): Promise<Room> {
  const hostId = code.trim()
  if (!hostId) throw new Error('Enter a room code')
  const { default: Peer } = await import('peerjs')
  const raw = new PeerTransport<NetMessage>(new Peer(), { hostId, validate: isNetMessage })
  const id = await raw.ready
  const room = createRoomSession(raw, id, name, hostId, hostId)
  // Membership must be acknowledged, not merely an open WebRTC channel.
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { unsubscribe(); room.close(); reject(new Error('Room join timed out')) }, 15_000)
    const unsubscribe = room.transport.onMessage(message => {
      if (message.type === 'roster' && message.payload.players.some(player => player.player_id === id)) {
        clearTimeout(timer); unsubscribe(); resolve(room)
      } else if (message.type === 'rejected' && message.payload.player_id === id) {
        clearTimeout(timer); unsubscribe(); room.close(); reject(new Error(message.payload.reason))
      }
    })
  })
}
