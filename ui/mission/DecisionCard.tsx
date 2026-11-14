// Anomaly card (GAME_DESIGN.md §4.2): the mission is paused until the player picks an option.

import { useEffect, useRef, type Ref } from 'react'
import { CONSOLE_LABEL, type Decision } from './game'

export interface DecisionCardProps {
  decision: Decision
  /** Sends `resolve_decision { decision_id, option_id }` (decision 004). */
  onDecide: (decisionId: string, optionId: string) => void
  /** e.g. "Day 143". */
  when?: string
  /** False when another player's console owns this card (co-op). */
  canAnswer?: boolean
}

/** Moves keyboard focus to the first option when a new card opens. */
export function DecisionCard(props: DecisionCardProps) {
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    first.current?.focus()
  }, [props.decision.decision_id])
  return <DecisionCardBody {...props} firstRef={first} />
}

/** The card itself, with no hooks (easy to test). */
export function DecisionCardBody({
  decision,
  onDecide,
  when,
  canAnswer = true,
  firstRef,
}: DecisionCardProps & { firstRef?: Ref<HTMLButtonElement> }) {
  const consoleName = CONSOLE_LABEL[decision.console] ?? decision.console.toUpperCase()
  const titleId = `mv-card-${decision.decision_id}`

  return (
    <div className="mv-decision" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
      <p className="mv-decision__meta">
        <span className="mv-decision__badge">⚠ Anomaly</span>
        <span>{consoleName} console</span>
        {when && <span>· {when}</span>}
        <span>· Mission paused</span>
      </p>
      <h3 id={titleId} className="mv-decision__title">
        {decision.title}
      </h3>
      <p className="mv-decision__body">{decision.body}</p>

      <div className="mv-decision__options">
        {decision.options.map((option, i) => (
          <button
            key={option.id}
            ref={i === 0 ? firstRef : undefined}
            type="button"
            className="mv-decision__option"
            disabled={!canAnswer}
            onClick={() => onDecide(decision.decision_id, option.id)}
          >
            <span className="mv-decision__key">{String.fromCharCode(65 + i)}</span>
            <span>
              <strong>{option.label}</strong>
              <span className="mv-decision__effect">{option.effect_text}</span>
            </span>
          </button>
        ))}
      </div>
      {!canAnswer && <p className="mv-muted mv-small">Waiting for the {consoleName} console to decide.</p>}

      {decision.story && (
        <aside className="mv-decision__story">
          <strong>
            {/^inspired by/i.test(decision.story.mission)
              ? decision.story.mission
              : `Based on a real event: ${decision.story.mission} (${decision.story.year})`}
          </strong>
          <span> {decision.story.text}</span>
          {decision.story.source_url && (
            <>
              {' '}
              <a href={decision.story.source_url} target="_blank" rel="noreferrer">
                Read more
              </a>
            </>
          )}
        </aside>
      )}
    </div>
  )
}
