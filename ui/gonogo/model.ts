// Turns the sim's design issues into a flight-controller poll (docs/game-design/GAME_DESIGN.md §4.1).
// Reasons are the sim's own issue messages: the poll invents nothing.
import type { Issue } from '../../shared'
import type { Role } from '../../shared/net'
import { launchAnywayFault } from '../../sim/sim'

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

/** A short problem and a short fix per issue code (5 words each at most), for screens with room for a few words. */
const BRIEF: Record<string, [problem: string, fix: string]> = {
  orbit_unreachable: ['Rocket cannot reach this orbit', 'Pick a bigger rocket'],
  mass_over_limit: ['Too heavy for the rocket', 'Cut mass or bigger rocket'],
  mass_margin_low: ['Almost too heavy to launch', 'Trim mass or bigger rocket'],
  delta_v_short: ['Engine too small for orbit', 'Pick a bigger-engine bus'],
  no_station_keeping: ['Orbit will drift', 'Pick a bus with thrusters'],
  orbit_life_short: ['Orbit ends too soon', 'Pick a longer-lived orbit'],
  behind_schedule: ['Build takes too long', 'Pick faster-to-build parts'],
  added_mass_over_bus: ['Bus is carrying too much', 'Remove parts or bigger bus'],
  bus_too_small: ['Parts too big for bus', 'Pick a bigger bus'],
  power_negative: ['Not enough power to survive', 'Pick a bigger power source'],
  power_short: ['Not enough power', 'Pick a bigger power source'],
  power_fades: ['Power fades over the years', 'Pick a bigger power source'],
  battery_small: ['Battery too small for night', 'Pick a bigger battery'],
  bus_life_short: ['Bus wears out early', 'Pick a longer-life bus'],
  radiation_risk: ['Radiation may kill the bus', 'Tougher bus or calmer orbit'],
  missing_instrument: ['No instrument on board', 'Add an instrument'],
  unknown_instrument: ['Unknown instrument', 'Remove it'],
  too_many_instruments: ['Too many instruments', 'Remove one or bigger bus'],
  off_best_orbit: ['Instrument in the wrong orbit', 'Change orbit or instrument'],
  science_short: ['Science goal out of reach', 'Add science, fix the downlink'],
  link_weak: ['Radio too weak this far', 'Pick a stronger radio'],
  downlink_short: ['More data than radio sends', 'Stronger radio or more stations'],
  over_budget: ['Over budget', 'Pick cheaper parts'],
}
const SLOT_WORD: Record<string, string> = { launch_vehicle: 'rocket', orbit: 'orbit', bus: 'bus', solar: 'power source', battery: 'battery', comms: 'radio' }

/** The console's worst issue in a few words: what is wrong, and what to do. Null when it has nothing to say. */
export function brief(call: ConsoleCall): { problem: string; fix: string } | null {
  const worst = call.reasons.find((r) => r.severity === 'error') ?? call.reasons[0]
  if (!worst) return null
  const known = BRIEF[worst.code]
  if (known) return { problem: known[0], fix: known[1] }
  const slot = /^(missing|unknown|wrong_type)_(.+)$/.exec(worst.code)
  const word = slot && SLOT_WORD[slot[2]!]
  if (slot && word) return slot[1] === 'missing' ? { problem: `No ${word} picked`, fix: `Pick ${word === 'orbit' ? 'an' : 'a'} ${word}` } : { problem: `Wrong ${word} picked`, fix: `Pick another ${word}` }
  // A code this table does not know yet: the start of the sim's own sentence.
  const words = worst.message.split(/[.!?]/)[0]!.split(/\s+/)
  return { problem: words.slice(0, 6).join(' ') + (words.length > 6 ? '…' : ''), fix: '' }
}

/** The one line a console shows: its worst issue in a few words (`brief`), or the first sentence of the sim's message for a code `brief` does not know. The rest goes behind ⓘ. */
export function headline(call: ConsoleCall): string {
  const short = brief(call)
  if (short?.fix) return `${short.problem}. ${short.fix}.`
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

/**
 * The question before a crew launches against a NO-GO, naming the problem that will decide the flight:
 * "PLAN says NO-GO: Too heavy for the rocket. Launch anyway?". Null when nothing may be launched anyway.
 */
export function launchAnywayQuestion(issues: Issue[]): string | null {
  const issue = issues.find((i) => i.severity === 'error' && i.code === launchAnywayFault(issues))
  if (!issue) return null
  const call = poll(issues).find((c) => c.id === consoleFor(issue))!
  return `${call.label} says NO-GO: ${brief({ ...call, reasons: [issue] })!.problem}. Launch anyway?`
}
