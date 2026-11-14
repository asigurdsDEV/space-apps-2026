// Co-op pieces of the shell: the room code, the crew list with the role picker, the lobby
// and the notice banner. Like the game screens, they only know about `Session`.

import { useState } from 'react'
import { ROLES } from '../shared'
import { ROLE_LABELS, type Session, type SessionSnapshot } from './session'
import { useSession } from './useSession'

/** The session's notice, with a button to dismiss it. */
export function Notice({ session, notice }: { session: Session; notice: string | null }) {
  return (
    <div role="status">
      {notice && (
        <p className="app-notice">
          <span>{notice}</span>
          <button type="button" className="app-notice-close" aria-label="Dismiss message" onClick={() => session.dismissNotice()}>
            ×
          </button>
        </p>
      )}
    </div>
  )
}

export function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    // Clipboard access can be refused (no permission, not https); the code is on screen anyway.
    navigator.clipboard?.writeText(code).then(() => setCopied(true), () => {})
  }
  return (
    <p className="app-room">
      <span>Room code</span>
      <strong className="app-code">{code}</strong>
      <button type="button" className="app-button app-button-small" onClick={copy}>
        {copied ? 'Copied' : 'Copy code'}
      </button>
    </p>
  )
}

/** Who is in the room, and the four roles. A role someone else holds is disabled. */
export function Crew({ session, snapshot }: { session: Session; snapshot: SessionSnapshot }) {
  const { players, me } = snapshot
  return (
    <div className="app-crew">
      <ul className="app-crew-list">
        {players.map((player) => (
          <li key={player.player_id}>
            <span className="app-crew-name">
              {player.name}
              {player.player_id === me.player_id && ' (you)'}
              {player.is_host && <span className="app-tag">Host</span>}
            </span>
            <span className="app-crew-role">{player.role ? ROLE_LABELS[player.role] : 'No role yet'}</span>
          </li>
        ))}
      </ul>
      <div className="app-roles" role="group" aria-label="Pick your role">
        {ROLES.map((role) => {
          const holder = players.find((player) => player.role === role)
          const mine = holder?.player_id === me.player_id
          return (
            <button
              key={role}
              type="button"
              className="app-button app-role"
              aria-pressed={mine}
              disabled={holder !== undefined && !mine}
              onClick={() => session.claimRole?.(mine ? null : role)}
            >
              {ROLE_LABELS[role]}
              <span className="app-role-holder">{mine ? 'You (tap to give up)' : holder ? holder.name : 'Free'}</span>
            </button>
          )
        })}
      </div>
      <p className="app-start-note">A role nobody takes can be played by anyone.</p>
    </div>
  )
}

export interface LobbyProps {
  session: Session
  roomCode: string | null
  /** Leave the room and go back to the start screen. */
  onExit: () => void
}

/** Shown while the snapshot's stage is `lobby`. */
export function Lobby({ session, roomCode, onExit }: LobbyProps) {
  const snapshot = useSession(session)
  const host = snapshot.players.find((player) => player.is_host)
  return (
    <main className="app-start">
      <p className="app-kicker">Co-op lobby</p>
      <h1 className="app-start-title">Gather your crew</h1>
      {roomCode && <RoomCode code={roomCode} />}
      <Notice session={session} notice={snapshot.notice} />
      {snapshot.players.length === 0 ? <p>Joining the room…</p> : <Crew session={session} snapshot={snapshot} />}
      <div className="app-start-actions">
        {snapshot.me.is_host ? (
          <button type="button" className="app-button app-button-primary" onClick={() => session.start?.()}>
            Start mission
          </button>
        ) : (
          <p className="app-waiting">Waiting for {host?.name ?? 'the host'} to start the mission.</p>
        )}
        <button type="button" className="app-button" onClick={onExit}>
          Leave
        </button>
      </div>
    </main>
  )
}
