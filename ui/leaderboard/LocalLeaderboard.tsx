import { useEffect, useId, useState } from 'react'
import type { Params, Summary } from '../../shared'
import { savePersonalBest, type SaveResult } from './storage'
import '../theme/theme.css'
import './leaderboard.css'

export interface LocalLeaderboardProps {
  scenarioId: string
  summary: Summary
  design: Params
}

/** Mount only for an ended mission, using the final summary and state.params. */
export function LocalLeaderboard({ scenarioId, summary, design }: LocalLeaderboardProps) {
  const titleId = useId()
  const score = summary.score
  const [snapshot, setSnapshot] = useState<{ scenarioId: string; result: SaveResult } | null>(null)

  useEffect(() => {
    const result = typeof score === 'number'
      ? savePersonalBest(scenarioId, score, design)
      : { best: null, stored: false }
    setSnapshot({ scenarioId, result })
  }, [scenarioId, score, design])

  const result = snapshot?.scenarioId === scenarioId ? snapshot.result : null
  return (
    <section className="game-theme game-panel lb-root" aria-labelledby={titleId}>
      <h2 id={titleId}>Your mission record</h2>
      {!result ? <p role="status">Checking your personal best…</p> : !result.best ? (
        <p className="game-muted">This mission has no valid score to save yet.</p>
      ) : (
        <>
          <p className="lb-score game-stat"><strong>{result.best.score.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> points</p>
          <p className="game-muted" role="status">
            {result.stored ? 'Your best score for this scenario, saved in this browser.'
              : 'This browser could not save your record. This score is available for this visit only.'}
          </p>
          <details>
            <summary>{result.stored ? 'View saved design' : 'View this design'}</summary>
            <dl className="lb-design">
              {Object.entries(result.best.design).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => (
                <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</dd></div>
              ))}
            </dl>
          </details>
        </>
      )}
    </section>
  )
}
