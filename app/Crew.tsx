// The app's own chrome inside a game: the notice banner, and for online rooms the room code
// and the crew list with a role picker (the top bar's crew menu). The lobby itself is ui/lobby.

import { useState } from 'react'
import { ROLES, rolesOf } from '../shared'
import { ROLE_LABELS, type Session, type SessionSnapshot } from './session'

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
      <button type="button" className="game-button app-small" onClick={copy}>
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
            <span className="app-crew-role">{player.role ? rolesOf(players, player.player_id).map((role) => ROLE_LABELS[role]).join(' + ') : 'No role yet'}</span>
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
              className="game-button app-role"
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
      <p className="game-muted">A role nobody takes can be played by anyone.</p>
    </div>
  )
}
