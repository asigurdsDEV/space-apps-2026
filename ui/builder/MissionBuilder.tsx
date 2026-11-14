import { useEffect, useRef, useState } from 'react'
import type { Command, Dataset, Player, SimState } from '../../shared'
import {
  DEFAULT_SLOTS,
  ROLE_TITLES,
  budgetBars,
  callText,
  changedBy,
  commandAccess,
  playerLabel,
  slotAccess,
  termFor,
  columnLabel,
  formatValue,
  partFit,
  parseIds,
  slotColumns,
  slotParts,
  toggleId,
  unitOf,
  type Slot,
} from './model'
import { playSound } from '../audio'
import { poll } from '../gonogo'
import { Term } from '../learn'
import '../learn/learn.css'
import { SpaceView } from '../scene3d'
import '../theme/theme.css'
import './builder.css'

export interface MissionBuilderProps {
  /** Latest SimState. The builder reads entities (the parts), params, metrics and issues; it never changes state itself. */
  state: SimState
  /** Sends a Command to the app loop (or over net/ to the host). */
  send: (command: Command) => void
  slots?: Slot[]
  /** Co-op roster (Session snapshot `players`). With 2+ players each section shows its role and is locked for other roles. */
  players?: Player[]
  /** This browser's player (Session snapshot `me`). */
  me?: Player
  /** shortcut: unused since parts come from state.entities; kept so app/ code written against the first API still compiles. Remove once app/ stops passing it. */
  datasets?: Dataset[]
}

const UNIT_HEADERS = new Set(['kg', 'W', 'Wh', 'pts'])

const NO_PLAYERS: Player[] = []

/** A glossary tooltip when the word has one (ui/learn), plain text otherwise. */
const Label = ({ id, children }: { id?: string; children: string }) => (id ? <Term id={id}>{children}</Term> : <>{children}</>)

export function MissionBuilder({ state, send, slots = DEFAULT_SLOTS, players = NO_PLAYERS, me }: MissionBuilderProps) {
  const coop = players.length > 1
  // Who changed what: compare each new params snapshot with the last one.
  const prevParams = useRef(state.params)
  const mySends = useRef(new Set<string>())
  const [lastBy, setLastBy] = useState<Record<string, string>>({})
  useEffect(() => {
    if (prevParams.current === state.params) return
    const keys = slots.map((s) => s.key)
    const found = changedBy(prevParams.current, state.params, keys, players, me, mySends.current)
    prevParams.current = state.params
    for (const key of Object.keys(found)) mySends.current.delete(key)
    if (coop && Object.keys(found).length > 0) setLastBy((b) => ({ ...b, ...found }))
  }, [state.params, slots, players, me, coop])

  const setParam = (key: string, value: string) => {
    mySends.current.add(key)
    playSound('click')
    send({ type: 'set_param', payload: { key, value } })
  }
  const launch = commandAccess({ type: 'launch', payload: {} }, players, me)
  const errors = state.issues.filter((i) => i.severity === 'error')
  const warnings = state.issues.filter((i) => i.severity === 'warning')
  const bars = budgetBars(state.metrics)
  // Phones: the budgets fold away so the parts stay visible (console lights and Launch always show).
  const [panelOpen, setPanelOpen] = useState(false)
  const problems = bars.filter((b) => b.bad).length + errors.length
  const objective = state.params.objective_text

  return (
    <div className="mb">
      <div className="mb-parts">
        <h1 className="mb-title">Design your mission</h1>
        {typeof objective === 'string' && <p className="mb-objective">{objective}</p>}
        <SpaceView state={state} mode="spacecraft" className="mb-hero" />
        {slots.map((slot) => {
          const parts = slotParts(state.entities, slot)
          const columns = slotColumns(slot, state).filter((c) => parts.some((p) => p.props[c] != null))
          const value = state.params[slot.key]
          const picked = slot.multi ? parseIds(value) : typeof value === 'string' ? [value] : []
          const access = slotAccess(slot.key, players, me)
          const locked = coop && !access.canEdit
          return (
            <fieldset key={slot.key} className={`mb-slot${locked ? ' is-locked' : ''}`} disabled={locked}>
              <legend>
                <Label id={termFor(slot.key)}>{slot.label}</Label>
                {slot.multi && <span className="mb-muted"> (pick any)</span>}
                {coop && (
                  <span className="mb-role">
                    {ROLE_TITLES[access.role]} · {playerLabel(access.holder, me) ?? 'open to anyone'}
                  </span>
                )}
              </legend>
              {slot.hint && <p className="mb-hint">{slot.hint}</p>}
              {locked && (
                <p className="mb-lock">
                  Only {access.holder?.name} ({ROLE_TITLES[access.role]}) can change this. Talk it over with them!
                </p>
              )}
              {coop && lastBy[slot.key] && <p className="mb-muted mb-changed">Last changed by {lastBy[slot.key]}</p>}
              {parts.length === 0 ? (
                <p className="mb-muted">No parts of this kind loaded yet.</p>
              ) : (
                <div className="mb-table-wrap">
                  <table className="mb-table">
                    <thead>
                      <tr>
                        <th scope="col"><span className="mb-sr">Pick</span></th>
                        <th scope="col">Part</th>
                        {columns.map((c) => (
                          <th scope="col" key={c}>
                            <Label id={termFor(c)}>{columnLabel(c)}</Label>
                            {UNIT_HEADERS.has(unitOf(c)) && <span className="mb-muted"> ({unitOf(c)})</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map((part) => {
                        const inputId = `mb-${slot.key}-${part.id}`
                        const checked = picked.includes(part.id)
                        const description = part.props.description
                        const fit = partFit(part, state)
                        const rowClass = [checked && 'is-picked', fit.dim && 'is-dim'].filter(Boolean).join(' ')
                        return (
                          <tr key={part.id} className={rowClass || undefined}>
                            <td>
                              <input
                                id={inputId}
                                type={slot.multi ? 'checkbox' : 'radio'}
                                name={slot.key}
                                checked={checked}
                                onChange={() => setParam(slot.key, slot.multi ? toggleId(value, part.id) : part.id)}
                              />
                            </td>
                            <td>
                              <label htmlFor={inputId} className="mb-name">{part.name}</label>
                              {fit.badges.map((b) => (
                                <span key={b.text} className={`mb-badge is-${b.tone}`}>
                                  {b.text}
                                </span>
                              ))}
                              {typeof description === 'string' && <div className="mb-hint">{description}</div>}
                            </td>
                            {columns.map((c) => {
                              const v = part.props[c]
                              const unit = unitOf(c)
                              return (
                                <td key={c} className="mb-num">
                                  {typeof v === 'number' ? formatValue(v, UNIT_HEADERS.has(unit) ? '' : unit) : String(v ?? '—')}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </fieldset>
          )
        })}
      </div>

      <aside className={`mb-side${panelOpen ? ' is-open' : ''}`} aria-label="Mission budgets">
        <h2 className="mb-sr">Flight consoles</h2>
        <ul className="mb-consoles">
          {poll(state.issues).map((c) => {
            const mine = coop && me?.role === c.role
            return (
              <li key={c.id} className={`mb-console is-${c.call}${mine ? ' is-mine' : ''}`} title={c.reasons.map((r) => r.message).join('\n') || undefined}>
                <span className="mb-console-name">
                  {c.label}
                  {mine && <span className="mb-sr"> (your console)</span>}
                </span>
                <span className="mb-console-call">{callText(c)}</span>
              </li>
            )
          })}
        </ul>
        <button type="button" className="mb-side-toggle" aria-expanded={panelOpen} aria-controls="mb-budgets" onClick={() => setPanelOpen((o) => !o)}>
          {panelOpen ? 'Hide budgets ▾' : `Show budgets ▴${problems > 0 ? ` · ${problems} to fix` : ''}`}
        </button>
        <div id="mb-budgets" className="mb-budgets">
        <h2>Budgets</h2>
        {bars.length === 0 && <p className="mb-muted">Pick parts to see your budgets.</p>}
        {bars.map((b) => (
          <div key={b.label} className={`mb-bar${b.bad ? ' is-bad' : ''}${b.goal ? ' is-goal' : ''}`}>
            <div className="mb-bar-head">
              <span>
                <Label id={termFor(b.label)}>{b.label}</Label>
              </span>
              <span>
                {formatValue(b.used, b.unit)} / {formatValue(b.limit, b.unit)}
                {b.bad && (
                  <strong>
                    {' '}
                    {b.goal ? 'short by' : 'over by'} {formatValue(Math.abs(b.used - b.limit), b.unit)}
                  </strong>
                )}
              </span>
            </div>
            <div
              className="mb-track"
              role="meter"
              aria-label={b.label}
              aria-valuemin={0}
              aria-valuemax={b.limit}
              aria-valuenow={b.used}
              aria-valuetext={`${formatValue(b.used, b.unit)} of ${formatValue(b.limit, b.unit)}${b.goal ? ' goal' : ''}`}
            >
              <div className="mb-fill" style={{ width: `${Math.min(b.ratio, 1) * 100}%` }} />
            </div>
          </div>
        ))}

        {(errors.length > 0 || warnings.length > 0) && (
          <ul className="mb-issues">
            {[...errors, ...warnings].map((i) => (
              <li key={i.code + i.message} className={`mb-issue is-${i.severity}`}>
                <strong>{i.severity === 'error' ? 'Blocks launch' : 'Warning'}:</strong> {i.message}
              </li>
            ))}
          </ul>
        )}
        </div>

        <button
          type="button"
          className="mb-launch"
          disabled={errors.length > 0 || !launch.canEdit}
          onClick={() => send({ type: 'launch', payload: {} })}
        >
          Launch mission
        </button>
        {errors.length > 0 && <p className="mb-muted">Fix the issues above to launch.</p>}
        {errors.length === 0 && !launch.canEdit && (
          <p className="mb-muted">{launch.holder?.name} ({ROLE_TITLES[launch.role]}) launches when the team is ready.</p>
        )}
      </aside>
    </div>
  )
}
