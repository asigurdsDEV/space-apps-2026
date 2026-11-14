// Game-layer shapes and pure helpers from decision 004 (docs/game-design/GAME_DESIGN.md).
// The Decision shape mirrors the proposed `decision_required` event payload. When claude@ethan
// adds it to shared/, swap these local types for the shared ones.

import type { Params, Summary } from '../../shared'
import { num, outcomeLabel, str } from './format'

// ------------------------------------------------------------ anomaly cards

export interface DecisionOption {
  id: string
  label: string
  /** Plain-words consequence, e.g. "Science −40% from now on. No risk." */
  effect_text: string
}

export interface Decision {
  decision_id: string
  card_id: string
  title: string
  body: string
  /** Which console answers it: mission-planning | spacecraft | science | comms-resources. */
  console: string
  options: DecisionOption[]
  story?: { mission: string; year: number | string; text: string; source_url?: string }
}

export const CONSOLE_LABEL: Record<string, string> = {
  'mission-planning': 'PLAN',
  spacecraft: 'SPACECRAFT',
  science: 'SCIENCE',
  'comms-resources': 'COMMS',
}

// ------------------------------------------------------------------ stars

export interface Star {
  label: string
  earned: boolean
}

/** Bonus goals a scenario can set with the `bonus_goal` param (decision 004). */
export const BONUS_GOALS: Record<string, { label: string; met: (s: Summary) => boolean }> = {
  no_data_lost: { label: 'Lose no data', met: (s) => num(s, 'data_generated_gb') > 0 && num(s, 'data_lost_gb') === 0 },
  budget_left_20: {
    label: 'Finish with 20% of the budget left',
    met: (s) => num(s, 'budget_usd') > 0 && (num(s, 'budget_usd') - num(s, 'cost_usd')) / num(s, 'budget_usd') >= 0.2,
  },
  mass_margin_10: {
    label: 'Keep a 10% launch mass margin',
    met: (s) => num(s, 'mass_limit_kg') > 0 && (num(s, 'mass_limit_kg') - num(s, 'mass_kg')) / num(s, 'mass_limit_kg') >= 0.1,
  },
}

/** Score needed for the "Excellent" star. */
export const EXCELLENT_SCORE = 85

/**
 * The stars of GAME_DESIGN.md §4.5. Bonus goals only count on a successful mission.
 * A scenario without a known `bonus_goal` has no bonus star at all (2 stars, not a nameless one).
 */
export function stars(summary: Summary, bonusGoal?: string): Star[] {
  const success = str(summary, 'outcome') === 'success'
  const bonus = bonusGoal ? BONUS_GOALS[bonusGoal] : undefined
  return [
    { label: 'Mission success', earned: success },
    ...(bonus ? [{ label: bonus.label, earned: success && bonus.met(summary) }] : []),
    { label: `Excellent (${EXCELLENT_SCORE}+ points)`, earned: num(summary, 'score') >= EXCELLENT_SCORE },
  ]
}

export function starString(list: readonly Star[]): string {
  return list.map((s) => (s.earned ? '★' : '☆')).join('')
}

// --------------------------------------------------------------- what-if

/** One result from sim/analysis.ts `whatIf()` (claude@ethan): the same mission rerun with one change. */
export interface WhatIfFix {
  /** Plain words, e.g. "3 ground stations instead of 1". */
  change: string
  score: number
  grade?: string
  /** The params to load into the builder for "Try it". */
  params?: Params
}

/** Fixes that beat the current score, best first, at most `limit`. */
export function bestFixes(fixes: readonly WhatIfFix[], currentScore: number, limit = 3): WhatIfFix[] {
  return fixes
    .filter((f) => f.score > currentScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ------------------------------------------------------------ share card

export interface ShareInfo {
  title?: string
  /** "2026-11-14" for the daily mission, omitted otherwise. */
  daily?: string
  bonusGoal?: string
  anomalies?: number
}

/** Plain-text result for a group chat (GAME_DESIGN.md §4.6). No personal data. */
export function shareText(summary: Summary, info: ShareInfo = {}): string {
  const head = ['GO / NO-GO', info.daily ? `Daily ${info.daily}` : null, info.title ?? null].filter(Boolean).join(' · ')
  const score = `${starString(stars(summary, info.bonusGoal))}  ${Math.round(num(summary, 'score'))} pts (${str(summary, 'grade', '–')})`
  const tail = [outcomeLabel(str(summary, 'outcome', 'in_design')), info.anomalies ? `⚠ ${info.anomalies} anomal${info.anomalies === 1 ? 'y' : 'ies'} survived` : null]
    .filter(Boolean)
    .join(' · ')
  return [head, score, tail].join('\n')
}

// ---------------------------------------------------------- space weather

/** One real day of space weather (data/space-weather, NASA OMNI). Same shape as SpaceWeatherDay there. */
export interface SpaceWeather {
  date: string
  kp_max: number
  storm_g: number
  sunspots: number
  f107_sfu: number
}

/** NOAA geomagnetic storm scale names. */
export const STORM_LABEL = ['Quiet', 'G1 minor storm', 'G2 moderate storm', 'G3 strong storm', 'G4 severe storm', 'G5 extreme storm']

// ------------------------------------------------------ real mission match

/** A row of claude@jamie's `data/real-missions.json` (pass `rowsAsObjects(realMissions)` in). */
export interface RealMission {
  [column: string]: string | number | boolean | null
}

/**
 * The real mission most like the player's (GAME_DESIGN.md §4.4). Same body is required; then the
 * size class counts most (each 10× of launch mass apart = 1), an orbit mismatch costs 1 and an
 * objective mismatch 0.5, so a CubeSat never matches a 5-tonne flagship. Null if no body matches.
 */
export function matchMission(
  missions: readonly RealMission[],
  mine: { body: string; orbit?: string; objective?: string; mass_kg: number },
): RealMission | null {
  const logMass = Math.log10(Math.max(1, mine.mass_kg))
  const rank = (m: RealMission) =>
    Math.abs(Math.log10(Math.max(1, Number(m.mass_kg) || 1)) - logMass) +
    (m.orbit_class === mine.orbit ? 0 : 1) +
    (m.objective === mine.objective ? 0 : 0.5)
  return missions.filter((m) => m.body === mine.body).sort((a, b) => rank(a) - rank(b))[0] ?? null
}
