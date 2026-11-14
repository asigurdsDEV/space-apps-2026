// Words for the walls of the first-person mission control (decision 007): the mission call wall,
// one line per flight console, and the debrief wall. Pure functions, no React, no 3D.
// ui/hangar draws them (RoomScreens: title, numbers, calls, debrief). Words budget: numbers, not sentences.

import type { Config, Issue, Summary } from '../../shared'
import { consoleFor, type ConsoleId } from '../gonogo'
import { bestFixes, type WhatIfFix } from './game'
import { formatPoints, formatUsd, num, outcomeLabel, str } from './format'

/** Longest console line (decision 007 words budget). */
export const CONSOLE_LINE_MAX = 60
/** Longest fix shown on the debrief wall. */
export const FIX_MAX = 40

/** The mission call wall: the mission's name and three numbers. That is the whole briefing. */
export function callWall(config: Pick<Config, 'title' | 'params' | 'duration_s'>): { title: string; numbers: [string, string][] } {
  const p = config.params
  const budget = Number(p.budget_usd ?? 0)
  const goal = Number(p.target_science_score ?? p.science_goal ?? 0)
  const seconds = Number(p.mission_duration_s ?? 0) || config.duration_s
  return {
    // "First Light: your first Earth-observing CubeSat" → "First Light"
    title: config.title.split(':')[0]!.trim(),
    numbers: [
      ['Budget', budget > 0 ? formatUsd(budget) : 'No limit'],
      ['Science goal', goal > 0 ? `${formatPoints(goal)} pts` : 'Free play'],
      ['Mission', duration(seconds)],
    ],
  }
}

function duration(seconds: number): string {
  const days = seconds / 86_400
  if (!(days > 0)) return '—'
  if (days >= 360) {
    const years = Math.round((days / 365) * 2) / 2
    return `${years} year${years === 1 ? '' : 's'}`
  }
  return `${Math.round(days)} days`
}

/** A few words per sim issue code (sim/README.md). Anything else falls back to its trimmed message. */
const SHORT: Record<string, string> = {
  missing_launch_vehicle: 'Pick a rocket',
  missing_orbit: 'Pick an orbit',
  missing_bus: 'Pick a spacecraft bus',
  missing_solar: 'Pick a power source',
  missing_comms: 'Pick a radio',
  missing_instrument: 'Add an instrument',
  wrong_type_solar: 'Wrong part in the power slot',
  wrong_type_battery: 'Wrong part in the battery slot',
  orbit_unreachable: "Rocket can't reach this orbit",
  mass_over_limit: 'Too heavy for the rocket',
  added_mass_over_bus: 'Too much mass for the bus',
  too_many_instruments: 'Too many instruments for the bus',
  bus_too_small: 'A part needs a bigger bus',
  delta_v_short: 'Engine too weak to get there',
  power_negative: 'Not enough power',
  over_budget: 'Over budget',
  behind_schedule: "Can't be built in time",
  mass_margin_low: 'Less than 10% mass margin',
  no_station_keeping: 'No engine to hold the orbit',
  off_best_orbit: 'Instrument not suited to this orbit',
  radiation_risk: 'High radiation in this orbit',
  science_short: "Science goal is out of reach",
  power_short: 'Power is tight',
  power_fades: 'Power fades before the end',
  battery_small: "Battery won't last the eclipse",
  link_weak: 'Radio too weak at this range',
  downlink_short: "Radio can't send all the data home",
  bus_life_short: "Bus won't last the mission",
  orbit_life_short: 'Orbit decays before the end',
}

function shortOf(issue: Issue, max: number): string {
  const known = SHORT[issue.code] ?? (issue.code.startsWith('unknown_') ? 'Unknown part picked' : undefined)
  if (known) return known
  const first = issue.message.split(/(?<=\.)\s/)[0] ?? issue.message
  return first.length <= max ? first : `${first.slice(0, max - 1).trimEnd()}…`
}

/**
 * One console's line, at most 60 characters: "GO · All checks good", "GO · Power is tight",
 * "NO-GO · Too heavy for the rocket" (+ "+1 more" when it has several problems).
 */
export function consoleLine(issues: readonly Issue[], console: ConsoleId): string {
  const mine = issues.filter((i) => consoleFor(i) === console)
  const errors = mine.filter((i) => i.severity === 'error')
  const shown = errors[0] ?? mine[0]
  if (!shown) return 'GO · All checks good'
  const head = errors.length ? 'NO-GO · ' : 'GO · '
  const rest = (errors.length || mine.length) - 1
  const more = rest > 0 ? ` (+${rest} more)` : ''
  return head + shortOf(shown, CONSOLE_LINE_MAX - head.length - more.length) + more
}

/** The debrief wall: grade, one line, and the one change that would have helped most. */
export function debriefWall(summary: Summary, fixes: readonly WhatIfFix[] = []): { grade: string; line: string; fix?: string } {
  const score = Math.round(num(summary, 'score'))
  const best = bestFixes(fixes, score, 1)[0]
  const change = best?.change
  return {
    grade: str(summary, 'grade', '–'),
    line: `${outcomeLabel(str(summary, 'outcome', 'in_design'))} · ${score} pts`,
    ...(change ? { fix: change.length <= FIX_MAX ? change : `${change.slice(0, FIX_MAX - 1).trimEnd()}…` } : {}),
  }
}
