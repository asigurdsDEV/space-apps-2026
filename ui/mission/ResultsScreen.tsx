// End-of-mission results: grade, score, why it went the way it did, and the key numbers.
// Reads the `summary` object from the `scenario_ended` event (or sim `summary(state)`).

import type { Command, Summary } from '../../shared'
import { Bar } from './Bar'
import {
  formatGb,
  formatKg,
  formatPct,
  formatPoints,
  formatUsd,
  num,
  outcomeLabel,
  outcomeTone,
  splitSentences,
  str,
} from './format'

export interface ResultsScreenProps {
  summary: Summary
  onCommand: (command: Command) => void
  title?: string
}

export function ResultsScreen({ summary, onCommand, title }: ResultsScreenProps) {
  const outcome = str(summary, 'outcome', 'in_design')
  const tone = outcomeTone(outcome)
  const score = num(summary, 'score')
  const grade = str(summary, 'grade', '–')
  const why = splitSentences(str(summary, 'why'))

  const science = num(summary, 'science_score')
  const goal = num(summary, 'science_goal')
  const cost = num(summary, 'cost_usd')
  const budget = num(summary, 'budget_usd')
  const mass = num(summary, 'mass_kg')
  const massLimit = num(summary, 'mass_limit_kg')
  const generated = num(summary, 'data_generated_gb')
  const downlinked = num(summary, 'data_downlinked_gb')
  const lost = num(summary, 'data_lost_gb')
  const days = num(summary, 'mission_days_flown')

  return (
    <section className={`mv mv-results mv-tone-${tone}`} aria-label="Mission results">
      <header className="mv-results__head">
        <div className="mv-grade" aria-label={`Grade ${grade}`}>
          {grade}
        </div>
        <div>
          {title && <p className="mv-muted">{title}</p>}
          <h2 className="mv-title">{outcomeLabel(outcome)}</h2>
          <p className="mv-score">
            <strong>{Math.round(score)}</strong> / 100 points
            {days > 0 && <span className="mv-muted"> · {Math.floor(days)} days flown</span>}
          </p>
        </div>
      </header>

      {why.length > 0 && (
        <div className="mv-card">
          <h3>What happened</h3>
          <ul className="mv-why">
            {why.map((sentence, i) => (
              <li key={i}>{sentence}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mv-card">
        <h3>The numbers</h3>
        <Bar
          label="Science vs. goal"
          value={science}
          max={goal}
          tone={goal > 0 && science >= goal ? 'good' : 'warn'}
          detail={goal > 0 ? `${formatPoints(science)} / ${formatPoints(goal)} pts` : `${formatPoints(science)} pts`}
        />
        <Bar
          label="Budget used"
          value={cost}
          max={budget}
          tone={budget > 0 && cost > budget ? 'bad' : 'good'}
          detail={budget > 0 ? `${formatUsd(cost)} of ${formatUsd(budget)}` : formatUsd(cost)}
        />
        <Bar
          label="Launch mass vs. rocket limit"
          value={mass}
          max={massLimit}
          tone={massLimit > 0 && mass > massLimit ? 'bad' : 'info'}
          detail={massLimit > 0 ? `${formatKg(mass)} of ${formatKg(massLimit)}` : formatKg(mass)}
        />
        <Bar
          label="Data sent home"
          value={downlinked}
          max={generated}
          tone={lost > 0 ? 'warn' : 'good'}
          detail={
            generated > 0
              ? `${formatGb(downlinked)} of ${formatGb(generated)} (${formatPct(downlinked / generated)})`
              : formatGb(downlinked)
          }
        />
      </div>

      <div className="mv-controls">
        <button type="button" className="mv-primary" onClick={() => onCommand({ type: 'reset', payload: {} })}>
          ↺ Design a new mission
        </button>
      </div>
    </section>
  )
}
