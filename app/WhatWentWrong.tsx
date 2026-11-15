// After a mission flown against a NO-GO ("Launch anyway") is lost: why, what really happens, and a way to fix it.
import { useEffect, useId, useRef } from 'react'
import type { Command, SimState } from '../shared'
import { designOf } from '../sim'
import { LAUNCH_ANYWAY } from '../sim/sim'
import { playSound } from '../ui/audio'
import { CONSOLES, consoleFor } from '../ui/gonogo'

/** Per sim LAUNCH_ANYWAY code: the launch cutscene's caption (lost on the way up only) and the real practice behind it. */
const CAUSES: Record<string, { caption?: string; practice: string }> = {
  orbit_unreachable: {
    caption: 'This rocket cannot reach that orbit: it fell short, drifted off course, and range safety destroyed it.',
    practice: 'Planners read each rocket’s payload chart first: it says how much the rocket can carry to each orbit.',
  },
  mass_over_limit: {
    caption: 'Too heavy: the rocket fell short of orbital speed, drifted off course, and range safety destroyed it.',
    practice: 'Real missions keep at least 10% of the rocket’s lift spare, because spacecraft get heavier while they are built.',
  },
  power_negative: { practice: 'Engineers add up the power of every part in a power budget, and keep some spare, before anything flies.' },
  delta_v_short: { practice: 'Planners add up every engine burn the trip needs (its delta-v) and carry fuel to spare.' },
}

/** The launch cutscene's failure caption for a mission lost on the way up after a "Launch anyway". */
export const launchCause = (fault: unknown): string | undefined => CAUSES[String(fault)]?.caption

/** Back to design for the same mission, with the same parts still fitted: the clock and the money start again. */
export function tryAgain(send: (command: Command) => void, params: SimState['params']): void {
  send({ type: 'reset', payload: {} })
  for (const [key, value] of Object.entries(designOf(params))) send({ type: 'set_param', payload: { key, value } })
}

export interface WhatWentWrongProps {
  /** The ended state; `metrics.fault` says what lost it. */
  state: SimState
  /** In the guided campaign the way out is the mission board. */
  campaign: boolean
  onTryAgain: () => void
  onExit: () => void
  /** Esc: close it and show the debrief behind it. */
  onBack: () => void
}

/** A native modal dialog in the Mission menu's look: it holds the focus and Esc goes back. */
export function WhatWentWrong({ state, campaign, onTryAgain, onExit, onBack }: WhatWentWrongProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useId()
  const fault = String(state.metrics.fault ?? '')
  // The design is unchanged after launch, so the console's NO-GO is still in the issues.
  const nogo = state.issues.find((i) => i.code === fault)
  const console = nogo && CONSOLES.find((c) => c.id === consoleFor(nogo))
  useEffect(() => {
    if (!dialog.current!.open) dialog.current!.showModal()
    playSound('failure')
  }, [])
  const leave = (then: () => void) => () => {
    dialog.current?.close()
    then()
  }

  return (
    <dialog ref={dialog} className="game-theme app-world-menu app-wrong" data-theme="dark" aria-labelledby={title}
      onCancel={(e) => { e.preventDefault(); leave(onBack)() }}>
      <h1 id={title}>What went wrong</h1>
      {nogo && console && <><h2>{console.label} said NO-GO</h2><p>{nogo.message}</p></>}
      <h2>What happened</h2>
      <p>{LAUNCH_ANYWAY[fault]}</p>
      <h2>In real missions</h2>
      <p className="game-muted">{CAUSES[fault]?.practice}</p>
      <button type="button" className="game-button" autoFocus onClick={leave(onTryAgain)}>Try again</button>
      <button type="button" className="game-button" onClick={leave(onExit)}>{campaign ? 'Mission board' : 'Main menu'}</button>
    </dialog>
  )
}
