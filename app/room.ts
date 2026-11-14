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

/** Port 53 is blocked by browsers and stalls ICE. :5349 must stay. */
function dropPort53(url: string): boolean {
  return !/:53(?!\d)/.test(url)
}

interface IceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

/** Cloudflare TURN from /api/ice. Undefined means "use PeerJS defaults" (local dev, or relay not configured). */
export async function cloudflareIceServers(): Promise<RTCIceServer[] | undefined> {
  try {
    const response = await fetch('/api/ice')
    if (!response.ok) return undefined
    const body = (await response.json()) as { iceServers?: IceServer[] }
    if (!Array.isArray(body.iceServers)) return undefined
    const iceServers = body.iceServers.flatMap((server) => {
      const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(dropPort53)
      return urls.length > 0 ? [{ ...server, urls }] : []
    })
    return iceServers.length > 0 ? iceServers : undefined
  } catch {
    return undefined
  }
}

/**
 * Host a new room (`joinCode` null) or join the room with that code. Resolves when the room
 * can be used; rejects with a readable Error when the broker or the host cannot be reached.
 */
export async function openRoom(joinCode: string | null): Promise<OpenRoom> {
  const { Peer } = await import('peerjs')
  const code = joinCode ?? newRoomCode()
  const iceServers = await cloudflareIceServers()
  // Custom config replaces PeerJS defaults, so /api/ice must include STUN and TURN.
  const options = iceServers ? { config: { iceServers } } : undefined
  const peer = joinCode
    ? options ? new Peer(options) : new Peer()
    : options ? new Peer(PEER_ID_PREFIX + code, options) : new Peer(PEER_ID_PREFIX + code)
  const transport = new PeerTransport<NetMessage>(peer, {
    validate: isNetMessage,
    ...(joinCode ? { hostId: PEER_ID_PREFIX + code } : {}),
    // Relay setup on a locked-down network can take longer than a direct link.
    ...(iceServers ? { timeoutMs: 30_000 } : {}),
  })
  await transport.ready
  return { transport, code }
}
