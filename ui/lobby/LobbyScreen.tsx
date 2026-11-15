import { useId, useRef, useState } from 'react'
import type { Player, Role } from '../../shared'
import { Term } from '../learn'
import '../learn/learn.css'
import { ROLE_DETAILS, roleChoices } from './model'
import './lobby.css'
import { ConsoleArt } from './ConsoleArt'

export interface LobbyScreenProps {
  code: string | null
  players: readonly Player[]
  me: Player
  onClaimRole: (role: Role | null) => void
  onContinue: () => void
  onLeave: () => void
  busy?: boolean
  error?: string | null
}

export function LobbyScreen({ code, players, me, onClaimRole, onContinue, onLeave, busy = false, error }: LobbyScreenProps) {
  const id = useId()
  const codeInput = useRef<HTMLInputElement>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [copyError, setCopyError] = useState(false)
  const self = players.find(player => player.player_id === me.player_id)
  async function copyCode() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code); setCopyError(false)
    } catch {
      setCopiedCode(null); setCopyError(true); codeInput.current?.focus(); codeInput.current?.select()
    }
  }
  return (
    <main className="ls-root">
      <div className="ls-layout">
        <header className="ls-header">
          <p className="ls-eyebrow">First Flight · Mission control</p>
          <h1>Your crew. One mission.</h1>
          <div className="ls-sequence" aria-label="Mission stages"><span aria-current="step">01 / Assemble</span><span>02 / Brief</span><span>03 / Build</span><span>04 / Fly</span></div>
          <p>Pick a role and plan together. Every choice shares the same mission resources.</p>
        </header>
        <section className="ls-panel" aria-labelledby={`${id}-room`}>
          <h2 id={`${id}-room`}>{code ? 'Invite your crew' : 'Local crew'}</h2>
          {code ? <>
            <label htmlFor={`${id}-code`}>Room code</label>
            <div className="ls-code-row"><input ref={codeInput} id={`${id}-code`} readOnly value={code}
              onFocus={event => event.currentTarget.select()} spellCheck={false} />
              <button type="button" onClick={copyCode} disabled={busy}>{copiedCode === code ? 'Copied' : 'Copy code'}</button></div>
            <p className="ls-hint" role="status">{copyError ? 'Copy unavailable. The code is selected; copy it manually.' : 'Share the entire code. Your teammates choose “Join a room” on the Start screen.'}</p>
          </> : <p className="ls-hint">Same-screen play uses this device. No online room code is needed.</p>}
        </section>
        <section className="ls-panel" aria-labelledby={`${id}-crew`}>
          <h2 id={`${id}-crew`}>Crew <span className="ls-muted">{players.length} / 4</span></h2>
          <div className="ls-seats" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <span key={index} className={players[index] ? 'ls-seat ls-seat-filled' : 'ls-seat'}>{players[index] ? players[index].name.trim().slice(0, 1).toUpperCase() : '＋'}</span>)}</div>
          <ul className="ls-crew">
            {players.map(player => <li key={player.player_id}>
              <div><strong>{player.name}</strong>{player.player_id === me.player_id && ' (you)'}{player.is_host && <span className="ls-badge">Host</span>}</div>
              <span className="ls-muted">{player.role ? ROLE_DETAILS[player.role].title : 'Choosing a role'}</span>
            </li>)}
          </ul>
          {!players.length && <p role="status">Waiting for the room roster…</p>}
        </section>
        <section className="ls-panel ls-wide" aria-labelledby={`${id}-roles`} aria-busy={busy}>
          <h2 id={`${id}-roles`}>Choose your role</h2>
          <p className="ls-hint">One player per role. With fewer than four people, anyone can cover an unclaimed role.</p>
          <p className="ls-hint">Plan your <Term id="orbit" /> together and weigh your spacecraft’s <Term id="reliability" />.</p>
          <div className="ls-roles">
            {roleChoices(players, me.player_id).map(choice => <button type="button" key={choice.role}
              className="ls-role" disabled={busy || choice.taken || !self} aria-pressed={choice.mine}
              onClick={() => onClaimRole(choice.mine ? null : choice.role)}>
              <strong>{choice.title}</strong><ConsoleArt role={choice.role} /><span>{choice.description}</span>
              <span className="ls-owner">{choice.mine ? 'Your role · select to release' : choice.owner ? `Taken by ${choice.owner.name}` : 'Available · select to claim'}</span>
            </button>)}
          </div>
          {error && <p className="ls-error" role="alert">{error}</p>}
          <div className="ls-actions">
            <button type="button" className="ls-secondary" onClick={onLeave} disabled={busy}>Leave room</button>
            {self?.is_host ? <button type="button" className="ls-primary" onClick={onContinue} disabled={busy}>
              {busy ? 'Please wait…' : 'Continue to briefing'}
            </button> : <p className="ls-hint" role="status">Waiting for the host to continue to the mission briefing.</p>}
          </div>
          <p className="ls-hint">The host can continue with one to four players. You will review the mission and build your spacecraft before launch.</p>
        </section>
      </div>
    </main>
  )
}
