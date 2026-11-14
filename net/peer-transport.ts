import type { MessageHandler, Transport, Unsubscribe } from './transport'

/** Minimal PeerJS surface, also usable by a deterministic test double. */
export interface DataChannel {
  readonly peer: string
  readonly open: boolean
  on(event: 'open' | 'close', handler: () => void): unknown
  on(event: 'data', handler: (data: unknown) => void): unknown
  on(event: 'error', handler: (error: Error) => void): unknown
  send(data: unknown): void
  close(): void
}
export interface PeerEndpoint {
  on(event: 'open', handler: (id: string) => void): unknown
  on(event: 'connection', handler: (connection: DataChannel) => void): unknown
  on(event: 'error', handler: (error: Error) => void): unknown
  on(event: 'disconnected' | 'close', handler: () => void): unknown
  connect(id: string, options: { reliable: boolean; serialization: 'json' }): DataChannel
  destroy(): void
}

export type ConnectionStatus = 'connecting' | 'ready' | 'closed' | 'error'
export interface PeerTransportOptions<Message> {
  /** Omit to host. Guests connect only to this host; no guest-to-guest relay. */
  hostId?: string
  validate: (data: unknown) => data is Message
  timeoutMs?: number
  /** Includes host; defaults to 4. */
  maxPlayers?: number
}

/** PeerJS adapter: host broadcasts, guests send only to host. No sim runs here. */
export class PeerTransport<Message> implements Transport<Message> {
  private handlers = new Set<MessageHandler<Message>>()
  private statusHandlers = new Set<(status: ConnectionStatus, error?: Error) => void>()
  private memberHandlers = new Set<(players: readonly string[]) => void>()
  private channels = new Map<string, DataChannel>()
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private ownId = ''
  private sending = 0
  private pendingMembers = false
  private currentStatus: ConnectionStatus = 'connecting'
  private lastError?: Error
  private resolveReady!: (id: string) => void
  private rejectReady!: (error: Error) => void
  readonly ready: Promise<string>
  readonly isHost: boolean

  constructor(private peer: PeerEndpoint, private options: PeerTransportOptions<Message>) {
    this.isHost = !options.hostId
    if (!Number.isInteger(options.maxPlayers ?? 4) || (options.maxPlayers ?? 4) < 1 || (options.maxPlayers ?? 4) > 4) {
      throw new Error('maxPlayers must be between 1 and 4')
    }
    this.ready = new Promise((resolve, reject) => { this.resolveReady = resolve; this.rejectReady = reject })
    // Subscribers can inspect status even if the caller delays awaiting ready.
    void this.ready.catch(() => {})
    const startupTimer = this.deadline(() => this.fail(new Error('Room connection timed out')))
    peer.on('open', id => {
      if (this.terminal) return
      this.ownId = id
      if (this.isHost) {
        this.cancel(startupTimer)
        this.markReady()
      } else {
        try {
          const connection = peer.connect(options.hostId!, { reliable: true, serialization: 'json' })
          this.attach(connection, () => { this.cancel(startupTimer); this.markReady() })
        } catch (error) {
          this.fail(error instanceof Error ? error : new Error('Could not connect to host'))
        }
      }
    })
    peer.on('connection', connection => {
      if (this.terminal || !this.isHost || this.channels.has(connection.peer) || this.channels.size >= (options.maxPlayers ?? 4) - 1) {
        connection.close()
        return
      }
      this.attach(connection)
    })
    peer.on('error', error => this.fail(error))
    // No host migration or silent reconnection. The app can select LocalTransport.
    peer.on('disconnected', () => this.fail(new Error('Signaling disconnected; create or rejoin a room')))
    peer.on('close', () => this.close())
  }

  get playerId(): string { return this.ownId }
  get roomCode(): string { return this.options.hostId ?? this.ownId }
  get status(): ConnectionStatus { return this.currentStatus }
  get players(): readonly string[] {
    return [this.ownId, ...[...this.channels.values()].filter(c => c.open).map(c => c.peer)].filter(Boolean)
  }
  private get terminal(): boolean { return this.currentStatus === 'closed' || this.currentStatus === 'error' }

  private deadline(action: () => void): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => { this.timers.delete(timer); action() }, this.options.timeoutMs ?? 15_000)
    this.timers.add(timer)
    return timer
  }
  private cancel(timer: ReturnType<typeof setTimeout>): void { clearTimeout(timer); this.timers.delete(timer) }
  private markReady(): void {
    if (this.terminal) return
    this.setStatus('ready')
    this.resolveReady(this.ownId)
    this.membersChanged()
  }
  private setStatus(status: ConnectionStatus, error?: Error): void {
    this.currentStatus = status
    this.lastError = error
    for (const handler of this.statusHandlers) handler(status, error)
  }
  private membersChanged(): void {
    // A roster sent by a disconnect listener must follow the current broadcast for every guest.
    if (this.sending) { this.pendingMembers = true; return }
    for (const handler of this.memberHandlers) handler(this.players)
  }
  private attach(connection: DataChannel, opened?: () => void): void {
    this.channels.set(connection.peer, connection)
    const timer = this.deadline(() => {
      if (!connection.open) {
        this.channels.delete(connection.peer)
        connection.close()
        if (!this.isHost) this.fail(new Error('Host connection timed out'))
      }
    })
    connection.on('open', () => {
      if (this.terminal || this.channels.get(connection.peer) !== connection) { connection.close(); return }
      this.cancel(timer)
      opened?.()
      this.membersChanged()
    })
    connection.on('data', data => {
      if (this.currentStatus !== 'ready' || !connection.open || this.channels.get(connection.peer) !== connection) return
      // A schema validator is mandatory: never cast an untrusted wire payload.
      if (!this.options.validate(data)) return
      for (const handler of this.handlers) handler(data, connection.peer)
    })
    const remove = () => {
      this.cancel(timer)
      if (this.channels.get(connection.peer) !== connection) return
      this.channels.delete(connection.peer)
      if (!this.isHost) this.fail(new Error('Host left the room'))
      else this.membersChanged()
    }
    connection.on('close', remove)
    connection.on('error', () => { remove(); connection.close() })
  }

  send(message: Message): void {
    if (this.currentStatus !== 'ready') throw new Error('Room is not ready')
    if (!this.options.validate(message)) throw new Error('Invalid outgoing message')
    // JSON serialization rejects cyclic objects and isolates subsequent mutation.
    const snapshot: Message = JSON.parse(JSON.stringify(message))
    this.sending++
    try {
      for (const connection of this.channels.values()) {
        if (!connection.open) continue
        try { connection.send(snapshot) } catch {
          this.channels.delete(connection.peer)
          connection.close()
          if (!this.isHost) this.fail(new Error('Could not send to host'))
          else this.membersChanged()
        }
      }
    } finally {
      this.sending--
      if (!this.sending && this.pendingMembers) {
        this.pendingMembers = false
        this.membersChanged()
      }
    }
  }
  onMessage(handler: MessageHandler<Message>): Unsubscribe {
    this.handlers.add(handler)
    return () => { this.handlers.delete(handler) }
  }
  onStatus(handler: (status: ConnectionStatus, error?: Error) => void): Unsubscribe {
    this.statusHandlers.add(handler)
    handler(this.currentStatus, this.lastError)
    return () => { this.statusHandlers.delete(handler) }
  }
  /** Host sees all connections; guests see themselves + host. Roster messages supply guest peers. */
  onPlayers(handler: (players: readonly string[]) => void): Unsubscribe {
    this.memberHandlers.add(handler)
    handler(this.players)
    return () => { this.memberHandlers.delete(handler) }
  }
  private fail(error: Error): void {
    if (this.terminal) return
    this.setStatus('error', error)
    this.rejectReady(error)
    this.dispose()
  }
  private dispose(): void {
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
    const channels = [...this.channels.values()]
    this.channels.clear()
    for (const connection of channels) connection.close()
    this.peer.destroy()
    this.handlers.clear()
    this.memberHandlers.clear()
    this.statusHandlers.clear()
  }
  close(): void {
    if (this.terminal) return
    this.setStatus('closed')
    this.rejectReady(new Error('Transport closed'))
    this.dispose()
  }
}
