import type { Config } from '../../shared'
import { glossaryEntry } from '../learn'
import { BONUS_GOALS } from '../mission'
import { HOW_TO_WIN, KEY_TERM_IDS, briefingFacts } from './model'
import '../theme/theme.css'
import './briefing.css'

export interface BriefingProps {
  /** The scenario being played (title + params). Available before the sim starts. */
  config: Pick<Config, 'title' | 'params' | 'duration_s'>
  /** Go on to the mission builder. */
  onStart: () => void
  /** Optional way back to the start screen. */
  onBack?: () => void
}

export function Briefing({ config, onStart, onBack }: BriefingProps) {
  const objective = config.params.objective_text
  const facts = briefingFacts(config)
  const bonusCode = config.params.bonus_goal
  const bonus = typeof bonusCode === 'string' ? BONUS_GOALS[bonusCode] : undefined

  return (
    <main className="bf">
      <div className="bf-inner">
        <p className="bf-kicker">Mission briefing</p>
        <h1 className="bf-title">{config.title}</h1>
        {typeof objective === 'string' && <p className="bf-objective">{objective}</p>}

        {facts.length > 0 && (
          <dl className="bf-facts">
            {facts.map((f) => (
              <div key={f.label} className="bf-fact">
                <dt>{f.label}</dt>
                <dd className="bf-fact-value">{f.value}</dd>
                <dd className="bf-fact-detail">{f.detail}</dd>
              </div>
            ))}
          </dl>
        )}

        {bonus && (
          <p className="bf-bonus">
            <span aria-hidden="true">★ </span>
            <strong>Bonus star:</strong> {bonus.label}. <span className="bf-bonus-hint">Win the mission and do this too for a second star.</span>
          </p>
        )}

        <section aria-labelledby="bf-win">
          <h2 id="bf-win">How to win</h2>
          <ol className="bf-win">
            {HOW_TO_WIN.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="bf-terms">
          <h2 id="bf-terms">Words you’ll see</h2>
          <dl className="bf-terms">
            {KEY_TERM_IDS.map((id) => {
              const entry = glossaryEntry(id)
              return (
                entry && (
                  <div key={id} className="bf-term">
                    <dt>{entry.term}</dt>
                    <dd>{entry.meaning}</dd>
                  </div>
                )
              )
            })}
          </dl>
        </section>

        <div className="bf-actions">
          {onBack && (
            <button type="button" className="bf-back" onClick={onBack}>
              Back
            </button>
          )}
          <button type="button" className="bf-start" onClick={onStart}>
            Start designing
          </button>
        </div>
      </div>
    </main>
  )
}
