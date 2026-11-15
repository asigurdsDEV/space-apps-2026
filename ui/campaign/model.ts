import { getScenario, PROGRAM } from '../../data'
import type { SimEvent, SimState } from '../../shared'

/** Existing missions and rules; the introduction uses the more forgiving Easy grant. */
export const MISSIONS = PROGRAM.map((id, index) => ({
  id,
  config: getScenario(id, index === 0 ? 'easy' : 'normal')!,
}))
export type CampaignProgress = readonly string[]
export const nextMission = (progress: CampaignProgress) => MISSIONS[progress.length]
export const canStartMission = (progress: CampaignProgress, id: string) => {
  const index = MISSIONS.findIndex((m) => m.id === id)
  return index >= 0 && index <= progress.length
}

/** Only contiguous completed missions unlock funding; stored money never sets a grant. */
export function validProgress(value: unknown): CampaignProgress {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) return []
  const completed: string[] = []
  for (const { id } of MISSIONS) {
    if (value[completed.length] !== id) break
    completed.push(id)
  }
  return completed
}

/** Called only for an active campaign session, never Daily, free play or a score alone. */
export function awardMission(progress: CampaignProgress, id: string, state: SimState, events: readonly SimEvent[]): CampaignProgress {
  const mission = nextMission(progress)
  if (mission?.id !== id || state.scenario_id !== mission.config.scenario_id || state.status !== 'ended') return progress
  if (!events.some((event) => event.type === 'scenario_ended' && event.payload.reason === 'success')) return progress
  return [...progress, id]
}

export const funding = (amount: unknown) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(Number(amount))

export function designGuide(state: Pick<SimState, 'metrics' | 'issues'>): string {
  const error = state.issues.find((i) => i.severity === 'error')
  if (error) return ({
    budget: 'Over budget · Fit a cheaper part or rocket',
    power: 'Power NO-GO · Check the Power and Battery stations',
    mass: 'Mass NO-GO · Check the Bus and Rocket stations',
    comms: 'Radio NO-GO · Check the Radio station',
    data: 'Data NO-GO · Check the radio and instruments',
    time: 'Schedule NO-GO · Choose faster-building parts',
    design: 'Design NO-GO · Check orbit and part compatibility',
  } as Record<string, string>)[error.resource] ?? 'Design NO-GO · Read the console and fix its first issue'
  const expected = Number(state.metrics.science_expected)
  const goal = Number(state.metrics.science_goal)
  if (expected < goal) return `Science ${Math.floor(expected)} / ${goal} · Improve the instruments and radio`
  return 'Design ready · Check the four consoles, then walk to Launch'
}
