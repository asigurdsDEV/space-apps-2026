// Pure display helpers for the mission run view and results screen.
// No React here so they are easy to test.

import type { Metrics, Summary } from '../../shared'

/** Read a number from metrics or a summary. Missing or non-finite values become 0. */
export function num(source: Metrics | Summary, key: string): number {
  const value = source[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** Read a string from metrics or a summary. */
export function str(source: Metrics | Summary, key: string, fallback = ''): string {
  const value = source[key]
  return typeof value === 'string' ? value : fallback
}

/** $1.2M, $850K, $900. */
export function formatUsd(usd: number): string {
  const sign = usd < 0 ? '-' : ''
  const abs = Math.abs(usd)
  if (abs >= 1e9) return `${sign}$${trim(abs / 1e9)}B`
  if (abs >= 1e6) return `${sign}$${trim(abs / 1e6)}M`
  if (abs >= 1e3) return `${sign}$${trim(abs / 1e3)}K`
  return `${sign}$${Math.round(abs)}`
}

/** 12.3 GB, 850 MB, 1.2 TB. */
export function formatGb(gb: number): string {
  const abs = Math.abs(gb)
  if (abs >= 1000) return `${trim(gb / 1000)} TB`
  if (abs > 0 && abs < 1) return `${Math.round(gb * 1000)} MB`
  return `${trim(gb)} GB`
}

export function formatKg(kg: number): string {
  return `${Math.round(kg).toLocaleString('en-US')} kg`
}

export function formatPoints(points: number): string {
  return Math.round(points).toLocaleString('en-US')
}

/** 0.873 → "87%". */
export function formatPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

/** "2027-03-14T00:00:00.000Z" → "14 Mar 2027". Falls back to the input if it isn't a date. */
export function formatDate(utc: string): string {
  const ms = Date.parse(utc)
  if (Number.isNaN(ms)) return utc
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Share of a bar to fill, clamped to 0..1. A limit of 0 means "no limit" and draws an empty bar. */
export function fillShare(value: number, limit: number): number {
  if (!(limit > 0)) return 0
  return Math.min(1, Math.max(0, value / limit))
}

function trim(value: number): string {
  return value >= 100 ? String(Math.round(value)) : String(Math.round(value * 10) / 10)
}

// ----------------------------------------------------------- phases

/** The steps the run view shows, in order. `launch` is a moment, not a sim phase, so it isn't listed. */
export const PHASES = ['design', 'cruise', 'operations', 'ended'] as const
export type Phase = (typeof PHASES)[number]

export const PHASE_LABEL: Record<string, string> = {
  design: 'Design',
  launch: 'Launch',
  cruise: 'Cruise',
  operations: 'Science ops',
  ended: 'Mission over',
}

export function phaseLabel(phase: string): string {
  return PHASE_LABEL[phase] ?? capitalize(phase.replace(/_/g, ' '))
}

// ---------------------------------------------------------- outcomes

export type Tone = 'info' | 'good' | 'warn' | 'bad'

const OUTCOME: Record<string, { label: string; tone: Tone }> = {
  success: { label: 'Mission success', tone: 'good' },
  science_shortfall: { label: 'Science goal missed', tone: 'warn' },
  launch_failure: { label: 'Launch failure', tone: 'bad' },
  spacecraft_failure: { label: 'Spacecraft lost', tone: 'bad' },
  over_budget: { label: 'Over budget', tone: 'bad' },
  in_flight: { label: 'In flight', tone: 'info' },
  in_design: { label: 'Not launched', tone: 'info' },
}

export function outcomeLabel(outcome: string): string {
  return OUTCOME[outcome]?.label ?? capitalize(outcome.replace(/_/g, ' '))
}

export function outcomeTone(outcome: string): Tone {
  return OUTCOME[outcome]?.tone ?? 'info'
}

// ----------------------------------------------------------- metrics

const METRIC_LABEL: Record<string, string> = {
  mass_kg: 'Launch mass',
  payload_mass_kg: 'Payload mass',
  power_w: 'Power draw',
  cost_usd: 'Cost',
  data_generated_gb_per_day: 'Daily data',
  schedule_months: 'Schedule',
  data_stored_gb: 'On-board storage',
  science_score: 'Science',
}

export function metricLabel(metric: string): string {
  return METRIC_LABEL[metric] ?? capitalize(metric.replace(/_(kg|w|usd|gb|bps|months|per_day)$/g, '').replace(/_/g, ' '))
}

/** Format a metric value using the unit its key ends with. */
export function formatMetric(metric: string, value: number): string {
  if (metric.endsWith('_usd')) return formatUsd(value)
  if (metric.endsWith('_kg')) return formatKg(value)
  if (metric.endsWith('_gb') || metric.endsWith('_gb_per_day')) return formatGb(value)
  if (metric.endsWith('_w')) return `${Math.round(value)} W`
  if (metric.endsWith('_months')) return `${trim(value)} months`
  return formatPoints(value)
}

/**
 * The summary's `why` is one string of sentences. Split it so the results screen can list them.
 * Splits after . ! ? when the next sentence starts with a capital letter or digit, so "$1.2M" stays whole.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9$])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
