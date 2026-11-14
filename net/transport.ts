import type { NetMessage } from '../shared'

/** Connection identity comes from the transport, never from a message payload. */
export type PlayerId = string
export type MessageHandler<Message> = (message: Message, from: PlayerId) => void
export type Unsubscribe = () => void

export interface Transport<Message = NetMessage> {
  send(message: Message): void
  onMessage(handler: MessageHandler<Message>): Unsubscribe
  close(): void
}

/** Browser-local delivery with network-like JSON isolation and no sim dependency. */
export class LocalTransport<Message = NetMessage> implements Transport<Message> {
  private handlers = new Set<MessageHandler<Message>>()
  private closed = false

  constructor(readonly playerId = 'local') {}

  send(message: Message): void {
    if (this.closed) throw new Error('Transport is closed')
    const snapshot: Message = JSON.parse(JSON.stringify(message))
    queueMicrotask(() => {
      if (!this.closed) for (const handler of this.handlers) handler(snapshot, this.playerId)
    })
  }

  onMessage(handler: MessageHandler<Message>): Unsubscribe {
    this.handlers.add(handler)
    return () => { this.handlers.delete(handler) }
  }

  close(): void {
    this.closed = true
    this.handlers.clear()
  }
}
