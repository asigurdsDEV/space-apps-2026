// What the briefing shows, derived from the scenario Config. No React here, so it's easy to test.
import type { Config, Params } from '../../shared'

export interface Fact {
  label: string
  value: string
  detail: string
}

const num = (params: Params, ...keys: string[]): number | undefined => {
  for (const k of keys) if (typeof params[k] === 'number' && (params[k] as number) > 0) return params[k] as number
  return undefined
}

const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })} million` : `$${Math.round(n / 1e3)}k`)

function duration(seconds: number): string {
  const days = seconds / 86400
  if (days >= 365 * 1.5) return `${(days / 365).toLocaleString(undefined, { maximumFractionDigits: 1 })} years`
  if (days >= 360) return '1 year'
  return `${Math.round(days)} days`
}

/** The mission's numbers, using data/README.md scenario keys (sim/README.md names as fallback). Missing ones are skipped. */
export function briefingFacts(config: Pick<Config, 'params' | 'duration_s'>): Fact[] {
  const p = config.params
  const facts: Fact[] = []
  const budget = num(p, 'budget_usd')
  if (budget) facts.push({ label: 'Budget', value: money(budget), detail: 'Everything: building the parts, the rocket, and running the mission.' })
  const goal = num(p, 'target_science_score', 'science_goal')
  if (goal) facts.push({ label: 'Science goal', value: `${goal} points`, detail: 'Earned only when your data reaches the ground.' })
  const days = num(p, 'mission_days')
  const seconds = num(p, 'mission_duration_s') ?? (days ? days * 86400 : undefined) ?? (config.duration_s > 0 ? config.duration_s : undefined)
  if (seconds) facts.push({ label: 'Mission length', value: duration(seconds), detail: 'How long you have to collect it.' })
  const deadline = num(p, 'deadline_months')
  if (deadline) facts.push({ label: 'Launch deadline', value: `${deadline} months`, detail: 'Building and testing parts takes time.' })
  return facts
}

export const HOW_TO_WIN: string[] = [
  'Reach the science goal before the mission ends. Science only counts once its data is sent home, so a great camera with a slow radio still loses.',
  'Stay inside the budget. The rocket is often the biggest bill.',
  'Make it fit: everything has to fit on your spacecraft bus, and the whole spacecraft has to fit on a rocket that can reach your orbit.',
  'Keep the power on: your power source has to cover everything, even while the spacecraft is in Earth’s shadow.',
  'You can’t launch while any problem says “Blocks launch”. Fix it, then launch and watch your mission fly.',
]

/** Glossary ids (ui/learn, cursor@kaipo) shown under "Words you'll see". The definitions live in the glossary only. */
export const KEY_TERM_IDS = ['orbit', 'payload-capacity', 'eclipse', 'downlink', 'power-budget', 'reliability'] as const
