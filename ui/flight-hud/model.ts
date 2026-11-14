// V2 flight HUD (docs/VISUAL_OVERHAUL.md): pure helpers, no React, no data/ or sim imports.
// HudTarget mirrors claude@jamie's TrainingTarget (data/pilot-training), so the app passes those in as is.

export interface HudTarget {
  id: string
  kind: 'observe' | 'relay'
  label: string
  hold_s: number
  requires: string[]
  feedback: { approach: string; scanning: string; done: string; partial: string; blocked: string }
  fact: string
  source_url: string
}

/** What `interact()` returned for each finished target. `partial` counts as finished. */
export type Results = Readonly<Record<string, 'done' | 'partial'>>

/** The target the scene says the player is aiming at. */
export interface HudFocus {
  id: string
  /** Distance to the target in metres, if the scene knows it. */
  distance_m?: number
  inRange: boolean
  /** Seconds of steady aim so far (0 when not holding). */
  held_s: number
}

export interface ControlHint {
  keys: string
  action: string
}

/**
 * shortcut: placeholder labels until V1 (codex@aiden, ui/pilot-input) publishes its actions;
 * pass V1's real hints in the `hints` prop then.
 */
export const DEFAULT_HINTS: ControlHint[] = [
  { keys: 'W A S D / drag', action: 'Fly' },
  { keys: 'Hold Space / hold Scan', action: 'Scan or transmit' },
  { keys: 'R', action: 'Recenter' },
  { keys: 'Esc', action: 'Pause' },
]

export type TargetState = 'done' | 'partial' | 'open' | 'locked'

export function targetState(t: HudTarget, results: Results): TargetState {
  if (results[t.id]) return results[t.id]!
  return t.requires.every((id) => results[id]) ? 'open' : 'locked'
}

/** The first target still to do, in route order. */
export function nextTarget(targets: readonly HudTarget[], results: Results): HudTarget | undefined {
  return targets.find((t) => targetState(t, results) === 'open')
}

export function formatDistance(m: number): string {
  return m >= 1000 ? `${Math.round(m / 1000).toLocaleString('en-US')} km` : `${Math.round(m)} m`
}

/** The line under the focused target: fly closer, approach, or scanning. */
export function focusLine(t: HudTarget, focus: HudFocus, results: Results): string {
  if (targetState(t, results) === 'locked') return t.feedback.blocked || `Finish ${t.requires.join(' and ')} first.`
  if (!focus.inRange) return focus.distance_m !== undefined ? `Fly closer: ${formatDistance(focus.distance_m)} away.` : 'Fly closer.'
  return focus.held_s > 0 ? t.feedback.scanning : t.feedback.approach
}

/** Scan bar fill, 0..1. */
export const scanShare = (t: HudTarget, focus: HudFocus) => (t.hold_s > 0 ? Math.min(1, Math.max(0, focus.held_s / t.hold_s)) : 0)
