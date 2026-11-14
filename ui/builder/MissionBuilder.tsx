import type { Command, Dataset, SimState } from '../../shared'
import {
  DEFAULT_SLOTS,
  SELF_FORMATTED_UNITS,
  budgetBars,
  columnLabel,
  findTable,
  formatValue,
  parseIds,
  statColumns,
  tableRows,
  toggleId,
  type Slot,
} from './model'
import './builder.css'

export interface MissionBuilderProps {
  /** Latest SimState. The builder reads params, metrics and issues; it never changes state itself. */
  state: SimState
  /** Parts catalogs (`table` Datasets). */
  datasets: Dataset[]
  /** Sends a Command to the app loop (or over net/ to the host). */
  send: (command: Command) => void
  slots?: Slot[]
}

export function MissionBuilder({ state, datasets, send, slots = DEFAULT_SLOTS }: MissionBuilderProps) {
  const setParam = (key: string, value: string) => send({ type: 'set_param', payload: { key, value } })
  const errors = state.issues.filter((i) => i.severity === 'error')
  const warnings = state.issues.filter((i) => i.severity === 'warning')
  const bars = budgetBars(state.metrics)
  const dataRate = state.metrics.data_rate_bps
  const science = state.metrics.science_score

  return (
    <div className="mb">
      <div className="mb-parts">
        <h1 className="mb-title">Design your mission</h1>
        {slots.map((slot) => {
          const table = findTable(datasets, slot.dataset)
          const value = state.params[slot.key]
          const picked = slot.multi ? parseIds(value) : typeof value === 'string' ? [value] : []
          return (
            <fieldset key={slot.key} className="mb-slot">
              <legend>
                {slot.label}
                {slot.multi && <span className="mb-muted"> (pick any)</span>}
              </legend>
              {slot.hint && <p className="mb-hint">{slot.hint}</p>}
              {!table ? (
                <p className="mb-muted">No “{slot.dataset}” catalog loaded yet.</p>
              ) : (
                <div className="mb-table-wrap">
                  <table className="mb-table">
                    <thead>
                      <tr>
                        <th scope="col"><span className="mb-sr">Pick</span></th>
                        <th scope="col">Part</th>
                        {statColumns(table).map((c) => (
                          <th scope="col" key={c}>
                            {columnLabel(c)}
                            {table.units[c] && !SELF_FORMATTED_UNITS.includes(table.units[c]) && (
                              <span className="mb-muted"> ({table.units[c]})</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows(table).map((row) => {
                        const id = String(row.id)
                        const inputId = `mb-${slot.key}-${id}`
                        const checked = picked.includes(id)
                        return (
                          <tr key={id} className={checked ? 'is-picked' : undefined}>
                            <td>
                              <input
                                id={inputId}
                                type={slot.multi ? 'checkbox' : 'radio'}
                                name={slot.key}
                                checked={checked}
                                onChange={() => setParam(slot.key, slot.multi ? toggleId(value, id) : id)}
                              />
                            </td>
                            <td>
                              <label htmlFor={inputId} className="mb-name">{String(row.name ?? id)}</label>
                              {row.description != null && <div className="mb-hint">{String(row.description)}</div>}
                            </td>
                            {statColumns(table).map((c) => (
                              <td key={c} className="mb-num">
                                {typeof row[c] === 'number'
                                  ? formatValue(row[c], SELF_FORMATTED_UNITS.includes(table.units[c]) ? table.units[c] : '')
                                  : String(row[c] ?? '—')}
                              </td>
                            ))}
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
          <div key={b.resource} className={`mb-bar${b.over ? ' is-over' : ''}`}>
            <div className="mb-bar-head">
              <span>{b.label}</span>
              <span>
                {formatValue(b.used, b.unit)} / {formatValue(b.limit, b.unit)}
                {b.over && <strong> over by {formatValue(b.used - b.limit, b.unit)}</strong>}
              </span>
            </div>
            <div
              className="mb-track"
              role="meter"
              aria-label={`${b.label} used`}
              aria-valuemin={0}
              aria-valuemax={b.limit}
              aria-valuenow={b.used}
              aria-valuetext={`${formatValue(b.used, b.unit)} of ${formatValue(b.limit, b.unit)}`}
            >
              <div className="mb-fill" style={{ width: `${Math.min(b.ratio, 1) * 100}%` }} />
            </div>
          </div>
        ))}
        {(typeof dataRate === 'number' || typeof science === 'number') && (
          <dl className="mb-stats">
            {typeof dataRate === 'number' && (<><dt>Data rate</dt><dd>{formatValue(dataRate, 'bps')}</dd></>)}
            {typeof science === 'number' && (<><dt>Science score</dt><dd>{formatValue(science, '')}</dd></>)}
          </dl>
        )}

        {(errors.length > 0 || warnings.length > 0) && (
          <ul className="mb-issues">
            {[...errors, ...warnings].map((i) => (
              <li key={i.code} className={`mb-issue is-${i.severity}`}>
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
