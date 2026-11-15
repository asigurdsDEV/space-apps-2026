import type { Entity, Params } from '../../shared'
import { engineeringReport, type CheckStatus } from './report'
import './readiness.css'

export interface ReadinessPanelProps {
  entities: Entity[]
  params: Params
  className?: string
}

const WORD: Record<CheckStatus, string> = { green: 'GREEN', yellow: 'YELLOW', red: 'RED' }

/** The live engineering board. Numbers come from the sim's design check, recomputed on every render. */
export function ReadinessPanel({ entities, params, className }: ReadinessPanelProps) {
  const report = engineeringReport({ entities, params })
  return (
    <section className={`rdy${className ? ` ${className}` : ''}`} aria-label="Engineering validation">
      <div className="rdy-head">
        <p className="rdy-kicker">Engineering</p>
        <h2 className={`rdy-banner rdy-${report.status}`}>{report.headline}</h2>
      </div>
      <p className={`rdy-${report.status}`}>{report.readiness}% mission readiness</p>
      <div className="rdy-meter" aria-hidden="true"><span className={`rdy-${report.status}`} style={{ width: `${report.readiness}%` }} /></div>
      <ul className="rdy-rows">
        {report.rows.map((row) => (
          <li key={row.id}>
            <strong>{row.label}</strong>
            <span className={`rdy-${row.status}`}>{WORD[row.status]} · {row.value}</span>
            {row.status !== 'green' && <p>{row.detail}</p>}
          </li>
        ))}
      </ul>
      <p className="rdy-note">These rows use the game's own mass, power, battery, radio and delta-v rules. They are a teaching check, not a certified engineering prediction. A design the sim accepts stays green.</p>
    </section>
  )
}
