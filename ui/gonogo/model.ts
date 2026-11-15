// Turns the sim's design issues into a flight-controller poll (docs/game-design/GAME_DESIGN.md §4.1).
// Reasons are the sim's own issue messages: the poll invents nothing.
import type { Issue } from '../../shared'
import type { Role } from '../../shared/net'

export type ConsoleId = 'plan' | 'spacecraft' | 'science' | 'comms'
export type Call = 'go' | 'go-concerns' | 'no-go'

/** `priority` is each console's own goal (GAME_DESIGN §4.7), the same ones the debrief's team card scores. */
export const CONSOLES: { id: ConsoleId; label: string; role: Role; priority: string }[] = [
  { id: 'plan', label: 'PLAN', role: 'mission-planning', priority: 'Keep 10% mass margin' },
  { id: 'spacecraft', label: 'SPACECRAFT', role: 'spacecraft', priority: 'No power warnings' },
  { id: 'science', label: 'SCIENCE', role: 'science', priority: 'Beat science goal by 25%' },
  { id: 'comms', label: 'COMMS', role: 'comms-resources', priority: 'No data lost, on budget' },
]

// Keep in sync with the issue codes in sim/README.md. Slot codes (missing_/unknown_/wrong_type_<slot>) go by slot.
const BY_CODE: Record<string, ConsoleId> = {
  orbit_unreachable: 'plan', mass_over_limit: 'plan', mass_margin_low: 'plan', delta_v_short: 'plan',
  no_station_keeping: 'plan', orbit_life_short: 'plan', behind_schedule: 'plan',
  added_mass_over_bus: 'spacecraft', bus_too_small: 'spacecraft', power_negative: 'spacecraft', power_short: 'spacecraft',
  power_fades: 'spacecraft', battery_small: 'spacecraft', bus_life_short: 'spacecraft', radiation_risk: 'spacecraft',
  missing_instrument: 'science', unknown_instrument: 'science', too_many_instruments: 'science',
  off_best_orbit: 'science', science_short: 'science',
  link_weak: 'comms', downlink_short: 'comms', over_budget: 'comms',
}
const BY_SLOT: Record<string, ConsoleId> = {
  launch_vehicle: 'plan', orbit: 'plan', bus: 'spacecraft', solar: 'spacecraft', battery: 'spacecraft', comms: 'comms',
}
const BY_RESOURCE: Record<string, ConsoleId> = {
  mass: 'plan', time: 'plan', design: 'plan', power: 'spacecraft', data: 'science', comms: 'comms', budget: 'comms',
}

export function consoleFor(issue: Issue): ConsoleId {
  const slot = /^(missing|unknown|wrong_type)_(.+)$/.exec(issue.code)?.[2]
  return BY_CODE[issue.code] ?? (slot && BY_SLOT[slot]) ?? BY_RESOURCE[issue.resource] ?? 'plan'
}

export interface ConsoleCall {
  id: ConsoleId
  label: string
  role: Role
  priority: string
  call: Call
  reasons: Issue[]
}

export function poll(issues: Issue[]): ConsoleCall[] {
  return CONSOLES.map((c) => {
    const reasons = issues.filter((i) => consoleFor(i) === c.id)
    const call: Call = reasons.some((i) => i.severity === 'error') ? 'no-go' : reasons.length ? 'go-concerns' : 'go'
    return { ...c, call, reasons }
  })
}

/** The one line a console shows: the first sentence of its worst issue. The rest goes behind ⓘ. */
export function headline(call: ConsoleCall): string {
  const first = (call.reasons.find((r) => r.severity === 'error') ?? call.reasons[0])?.message ?? ''
  return /^.*?[.!?](?=\s|$)/.exec(first)?.[0] ?? first
}

/** True when the console has more to say than its headline. */
export const hasMore = (call: ConsoleCall) => call.reasons.length > 1 || (call.reasons.length === 1 && headline(call) !== call.reasons[0].message)

/** Launch unlocks when no console is NO-GO. Concerns are a judgement call, not a block. */
export const canLaunch = (calls: ConsoleCall[]) => calls.every((c) => c.call !== 'no-go')

/** The sound for consoles that just called: one NO-GO makes it a NO-GO. Several at once (skip, reduced motion) get one sound, not a burst. */
export const soundFor = (called: ConsoleCall[]): 'go' | 'no-go' | null =>
  called.length === 0 ? null : called.some((c) => c.call === 'no-go') ? 'no-go' : 'go'
