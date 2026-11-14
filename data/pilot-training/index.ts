// Flight training route (V4, docs/VISUAL_OVERHAUL.md). Local training progress only:
// it never touches SimState, commands, science or score. See README.md here.

import raw from './route.json'

export type TargetKind = 'observe' | 'relay'
export type Outcome = 'done' | 'partial' | 'blocked'

export interface TrainingTarget {
  /** Stable id the scene, HUD and QA use. */
  id: string
  kind: TargetKind
  label: string
  /** Instrument ids (data/catalogs/instruments.json) that see this target well. Empty for a relay. */
  instruments: string[]
  /** Seconds the player holds aim to finish the scan or transmit. */
  hold_s: number
  /** Target ids that must be finished first. */
  requires: string[]
  /** Text for each moment; "" where that moment can't happen. */
  feedback: { approach: string; scanning: string; done: string; partial: string; blocked: string }
  fact: string
  source_url: string
}

export interface TrainingRoute {
  id: string
  title: string
  body: string
  intro: string
  complete_text: string
  targets: TrainingTarget[]
}

export const trainingRoute = raw as TrainingRoute

/**
 * What happens when the player finishes holding aim on `targetId`.
 * `done` = ids finished so far, `partIds` = the player's spacecraft parts.
 * Observing without a matching instrument still counts ("partial") so any design can finish training.
 * Null for an unknown target.
 */
export function interact(
  targetId: string,
  done: readonly string[],
  partIds: readonly string[],
  route: TrainingRoute = trainingRoute,
): { outcome: Outcome; text: string } | null {
  const t = route.targets.find((x) => x.id === targetId)
  if (!t) return null
  if (!t.requires.every((id) => done.includes(id))) return { outcome: 'blocked', text: t.feedback.blocked }
  const partial = t.kind === 'observe' && !t.instruments.some((id) => partIds.includes(id))
  return partial ? { outcome: 'partial', text: t.feedback.partial } : { outcome: 'done', text: t.feedback.done }
}

/** True once every target is finished. */
export const routeComplete = (done: readonly string[], route: TrainingRoute = trainingRoute) =>
  route.targets.every((t) => done.includes(t.id))
