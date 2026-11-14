import type { Config } from '../../shared'
import { HOW_TO_WIN, KEY_TERMS, briefingFacts } from './model'
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
            {KEY_TERMS.map((t) => (
              <div key={t.term} className="bf-term">
                <dt>{t.term}</dt>
                <dd>{t.meaning}</dd>
              </div>
            ))}
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
