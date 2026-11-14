import { useEffect, useId, useState } from 'react'
import type { Params, Summary } from '../../shared'
import { savePersonalBest, type RecordOptions, type SaveResult } from './storage'
import '../theme/theme.css'
import './leaderboard.css'

export interface LocalLeaderboardProps extends RecordOptions {
  scenarioId: string
  summary: Summary
  design: Params
}

/** Mount only for an ended mission, using the final summary and state.params. */
export function LocalLeaderboard({ scenarioId, summary, design, dailySeed, stars }: LocalLeaderboardProps) {
  const titleId = useId()
  const score = summary.score
  const [snapshot, setSnapshot] = useState<{ scenarioId: string; dailySeed?: number; result: SaveResult } | null>(null)

  useEffect(() => {
    const result = typeof score === 'number'
      ? savePersonalBest(scenarioId, score, design, { dailySeed, stars })
      : { best: null, stored: false }
    setSnapshot({ scenarioId, dailySeed, result })
  }, [scenarioId, score, design, dailySeed, stars])

  const result = snapshot?.scenarioId === scenarioId && Object.is(snapshot.dailySeed, dailySeed) ? snapshot.result : null
  return (
    <section className="game-theme game-panel lb-root" aria-labelledby={titleId}>
      <h2 id={titleId}>{dailySeed === undefined ? 'Your mission record' : 'Your daily mission record'}</h2>
      {!result ? <p role="status">Checking your personal best…</p> : !result.best ? (
        <p className="game-muted">This mission has no valid result to save yet.</p>
      ) : (
        <>
          <p className="lb-score game-stat"><strong>{result.best.score.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> points</p>
          {result.best.stars !== undefined && (
            <p className="game-muted"><span aria-hidden="true">{'★'.repeat(result.best.stars)}{'☆'.repeat(3 - result.best.stars)}</span> {result.best.stars} / 3 stars with this design</p>
          )}
          <p className="game-muted" role="status">
            {result.stored ? (dailySeed === undefined ? 'Your best score for this scenario, saved in this browser.' : 'Your best score for this daily mission, saved in this browser.')
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
