import type { Command, Dataset, SimState } from '../../shared'
import {
  DEFAULT_SLOTS,
  budgetBars,
  columnLabel,
  formatValue,
  parseIds,
  slotColumns,
  slotParts,
  toggleId,
  unitOf,
  type Slot,
} from './model'
import './builder.css'

export interface MissionBuilderProps {
  /** Latest SimState. The builder reads entities (the parts), params, metrics and issues; it never changes state itself. */
  state: SimState
  /** Sends a Command to the app loop (or over net/ to the host). */
  send: (command: Command) => void
  slots?: Slot[]
  /** shortcut: unused since parts come from state.entities; kept so app/ code written against the first API still compiles. Remove once app/ stops passing it. */
  datasets?: Dataset[]
}

const UNIT_HEADERS = new Set(['kg', 'W', 'Wh', 'pts'])

export function MissionBuilder({ state, send, slots = DEFAULT_SLOTS }: MissionBuilderProps) {
  const setParam = (key: string, value: string) => send({ type: 'set_param', payload: { key, value } })
  const errors = state.issues.filter((i) => i.severity === 'error')
  const warnings = state.issues.filter((i) => i.severity === 'warning')
  const bars = budgetBars(state.metrics)
  const objective = state.params.objective_text

  return (
    <div className="mb">
      <div className="mb-parts">
        <h1 className="mb-title">Design your mission</h1>
        {typeof objective === 'string' && <p className="mb-objective">{objective}</p>}
        {slots.map((slot) => {
          const parts = slotParts(state.entities, slot)
          const columns = slotColumns(slot, state).filter((c) => parts.some((p) => p.props[c] != null))
          const value = state.params[slot.key]
          const picked = slot.multi ? parseIds(value) : typeof value === 'string' ? [value] : []
          return (
            <fieldset key={slot.key} className="mb-slot">
              <legend>
                {slot.label}
                {slot.multi && <span className="mb-muted"> (pick any)</span>}
              </legend>
              {slot.hint && <p className="mb-hint">{slot.hint}</p>}
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
                            {columnLabel(c)}
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
                        return (
                          <tr key={part.id} className={checked ? 'is-picked' : undefined}>
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

      <aside className="mb-side" aria-label="Mission budgets">
        <h2>Budgets</h2>
        {bars.length === 0 && <p className="mb-muted">Pick parts to see your budgets.</p>}
        {bars.map((b) => (
          <div key={b.label} className={`mb-bar${b.bad ? ' is-bad' : ''}${b.goal ? ' is-goal' : ''}`}>
            <div className="mb-bar-head">
              <span>{b.label}</span>
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

        <button
          type="button"
          className="mb-launch"
          disabled={errors.length > 0}
          onClick={() => send({ type: 'launch', payload: {} })}
        >
          Launch mission
        </button>
        {errors.length > 0 && <p className="mb-muted">Fix the issues above to launch.</p>}
      </aside>
    </div>
  )
}
