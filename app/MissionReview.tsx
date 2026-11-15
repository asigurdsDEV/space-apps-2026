// The end-of-mission review in the 3D game: the same results screen as the Classic view (grade, score, stars, what one
// change would have scored, the full report), in a modal over mission control as soon as the ending has played.
// Back to Mission Control closes it; the debrief stays on the hall's wall.
import { useEffect, useId, useRef, type ReactNode } from 'react'
import type { Command, SimState, Summary } from '../shared'
import { ResultsScreen, teamPriorities, type WhatIfFix } from '../ui/mission'
import '../ui/mission/mission.css'
import '../ui/theme/menu-look.css'

export interface MissionReviewProps {
  state: SimState
  summary: Summary
  title: string
  bonusGoal?: string
  fixes?: readonly WhatIfFix[]
  onCommand: (command: Command) => void
  /** Load the flown design with this change back into mission control. */
  onTryFix: (fix: WhatIfFix) => void
  onBack: () => void
  /** The campaign's funding card, when this was a guided mission. */
  children?: ReactNode
}

export function MissionReview({ state, summary, title, bonusGoal, fixes, onCommand, onTryFix, onBack, children }: MissionReviewProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const label = useId()
  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
    if (!dialog.current!.open) dialog.current!.showModal()
  }, [])
  const leave = (then: () => void) => {
    dialog.current?.close()
    then()
  }
  return (
    <dialog ref={dialog} className="game-theme app-world-menu app-review mv-root menu-look" data-theme="dark" aria-labelledby={label}
      onCancel={(e) => { e.preventDefault(); leave(onBack) }}>
      <h1 id={label} className="app-review__title">Mission review</h1>
      <ResultsScreen summary={summary} onCommand={(c) => leave(() => onCommand(c))} title={title} bonusGoal={bonusGoal}
        fixes={fixes} onTryFix={(fix) => leave(() => onTryFix(fix))} priorities={teamPriorities(summary, state.issues)} />
      {children}
      <button type="button" className="game-button" onClick={() => leave(onBack)}>Back to Mission Control</button>
    </dialog>
  )
}
