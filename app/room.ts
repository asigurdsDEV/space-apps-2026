// Opens an online room with PeerJS. The only file in app/ that touches the network.
// PeerJS is loaded on demand, so solo and same-screen play never need it.

import { PeerTransport } from '../net'
import { isNetMessage, type NetMessage } from '../shared'

/** Room codes are short so they can be read out loud; the PeerJS id is this prefix plus the code. */
const PEER_ID_PREFIX = 'smdg-'
/** No 0/O or 1/I, which look alike. 32 letters, so a byte maps to one evenly. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function newRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('')
}

/** What the player typed, as a room code: upper case, letters and digits only. */
export function cleanRoomCode(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export interface OpenRoom {
  transport: PeerTransport<NetMessage>
  /** The code to show and share. */
  code: string
}

/**
 * Host a new room (`joinCode` null) or join the room with that code. Resolves when the room
 * can be used; rejects with a readable Error when the broker or the host cannot be reached.
 */
export async function openRoom(joinCode: string | null): Promise<OpenRoom> {
  const { Peer } = await import('peerjs')
  const code = joinCode ?? newRoomCode()
  const transport = joinCode
    ? new PeerTransport<NetMessage>(new Peer(), { validate: isNetMessage, hostId: PEER_ID_PREFIX + code })
    : new PeerTransport<NetMessage>(new Peer(PEER_ID_PREFIX + code), { validate: isNetMessage })
  await transport.ready
  return { transport, code }
}
