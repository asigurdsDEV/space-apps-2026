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
import { bestFixes, shareText, stars, TEAM_BONUS_AT, type Priority, type RealMission, type ShareInfo, type WhatIfFix } from './game'
import { ShareCard } from './ShareCard'

export interface ResultsScreenProps {
  summary: Summary
  onCommand: (command: Command) => void
  title?: string
  /** Scenario `bonus_goal` param, for the second star. */
  bonusGoal?: string
  /** Results of `whatIf()` (sim/analysis.ts): the same mission rerun with one change each. */
  fixes?: readonly WhatIfFix[]
  /** "Try it": load the design with this change back into the builder. */
  onTryFix?: (fix: WhatIfFix) => void
  /** Daily date and anomaly count for the share card. */
  share?: Pick<ShareInfo, 'daily' | 'anomalies'>
  /** The real NASA mission most like this one (`matchMission`). */
  realMatch?: RealMission | null
  /** Each console's own goal and whether it was met (`teamPriorities`). */
  priorities?: readonly Priority[]
}

export function ResultsScreen({ summary, onCommand, title, bonusGoal, fixes, onTryFix, share, realMatch, priorities }: ResultsScreenProps) {
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
  const starList = stars(summary, bonusGoal)
  const top = bestFixes(fixes ?? [], score)
  const won = outcome === 'success'
  const text = shareText(summary, { title, bonusGoal, ...share })

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
          <ul className="mv-stars" aria-label={`${starList.filter((s) => s.earned).length} of ${starList.length} stars`}>
            {starList.map((star) => (
              <li key={star.label} className={star.earned ? 'is-earned' : undefined}>
                <span aria-hidden="true">{star.earned ? '★' : '☆'}</span> {star.label}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {top.length > 0 && (
        <div className="mv-card mv-fixes">
          <h3>{won ? 'Even better' : 'Change one thing'}</h3>
          <ul>
            {top.map((fix) => (
              <li key={fix.change}>
                <span>
                  <strong>{fix.change}</strong>: this exact mission scores{' '}
                  <strong>
                    {Math.round(fix.score)}
                    {fix.grade ? ` (${fix.grade})` : ''}
                  </strong>{' '}
                  instead of {Math.round(score)}.
                </span>
                {onTryFix && (
                  <button type="button" onClick={() => onTryFix(fix)}>
                    Try it
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {priorities && priorities.length > 0 && (
        <div className="mv-card mv-team">
          <h3>Team priorities</h3>
          <ul>
            {priorities.map((p) => (
              <li key={p.console} className={p.met ? 'is-met' : undefined}>
                <span aria-hidden="true">{p.met ? '✓' : '✗'}</span> <strong>{p.console}</strong> {p.goal}
                <span className="mv-sr">{p.met ? ' (met)' : ' (missed)'}</span>
              </li>
            ))}
          </ul>
          <p className="mv-muted mv-small">
            {priorities.filter((p) => p.met).length >= TEAM_BONUS_AT
              ? `Team bonus: ${priorities.filter((p) => p.met).length} of ${priorities.length} priorities met. The consoles found a design that worked for everyone.`
              : `${priorities.filter((p) => p.met).length} of ${priorities.length} priorities met. These goals pull against each other, so the team has to agree which ones to give up.`}
          </p>
        </div>
      )}

      {realMatch && (
        <div className="mv-card mv-real">
          <h3>Your mission is most like</h3>
          <p>
            <strong>{String(realMatch.name)}</strong> ({String(realMatch.agency)}, {String(realMatch.year)}). {String(realMatch.fact)}{' '}
            {typeof realMatch.source_url === 'string' && (
              <a href={realMatch.source_url} target="_blank" rel="noreferrer">
                Source
              </a>
            )}
          </p>
        </div>
      )}

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

      <ShareCard text={text} />

      <div className="mv-controls">
        <button type="button" className="mv-primary" onClick={() => onCommand({ type: 'reset', payload: {} })}>
          ↺ Design a new mission
        </button>
      </div>
    </section>
  )
}
