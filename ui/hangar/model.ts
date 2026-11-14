// Mission control as a walk (decision 005, board V6): the stations in order, where each one is,
// and the camera path between them. Pure: no three.js, so it's cheap to test.

export type StationId = 'wall' | 'bay' | 'consoles' | 'pad' | 'ops' | 'debrief'

/** The screens app/ already switches between (same names as ui/story's StoryScreen). */
export type HangarScreen = 'briefing' | 'design' | 'poll' | 'flight' | 'results'

export type Vec3 = [number, number, number]

export interface Station {
  id: StationId
  /** What the player sees and hears ("You are at the assembly bay"). */
  name: string
  /** One short line: the task done here. */
  task: string
  /** Where the camera stands (eye height 1.7 m) and what it looks at. */
  eye: Vec3
  look: Vec3
}

/** One long control hall: the player walks along x and turns to each station on the front wall. */
const EYE_Y = 1.7
const at = (x: number, lookY: number): Pick<Station, 'eye' | 'look'> => ({ eye: [x, EYE_Y, 3.2], look: [x, lookY, -3] })

export const STATIONS: readonly Station[] = [
  { id: 'wall', name: 'Mission call wall', task: 'Read the mission call', ...at(0, 2.4) },
  { id: 'bay', name: 'Assembly bay', task: 'Build the spacecraft', ...at(9, 1.2) },
  { id: 'consoles', name: 'Flight consoles', task: 'Poll every console: GO or NO-GO', ...at(18, 1.3) },
  { id: 'pad', name: 'Launch pad window', task: 'Watch the launch', ...at(27, 3) },
  { id: 'ops', name: 'Operations room', task: 'Fly the mission and handle anomalies', ...at(36, 2.2) },
  { id: 'debrief', name: 'Debrief room', task: 'See what happened and what would have fixed it', ...at(45, 1.6) },
]

export function station(id: StationId): Station {
  return STATIONS.find((s) => s.id === id)!
}

/** The station for each screen the game shows. */
export function stationFor(screen: HangarScreen): StationId {
  return ({ briefing: 'wall', design: 'bay', poll: 'consoles', flight: 'ops', results: 'debrief' } as const)[screen]
}

export function nextStation(id: StationId): StationId {
  const i = STATIONS.findIndex((s) => s.id === id)
  return STATIONS[Math.min(i + 1, STATIONS.length - 1)]!.id
}

export function prevStation(id: StationId): StationId {
  const i = STATIONS.findIndex((s) => s.id === id)
  return STATIONS[Math.max(i - 1, 0)]!.id
}

/** Walking speed in m/s, and the shortest and longest walk, so far stations don't drag on. */
const SPEED = 9
const MIN_MS = 700
const MAX_MS = 2400

export function walkMs(from: StationId, to: StationId): number {
  const d = Math.abs(station(to).eye[0] - station(from).eye[0])
  return d === 0 ? 0 : Math.min(MAX_MS, Math.max(MIN_MS, (d / SPEED) * 1000))
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ease = (t: number) => t * t * (3 - 2 * t)

/**
 * The camera `t` (0..1) of the way from one station to another: eased, with a small step bob
 * (none when `still`, for reduced motion).
 */
export function walkPose(from: StationId, to: StationId, t: number, still = false): { eye: Vec3; look: Vec3 } {
  const a = station(from)
  const b = station(to)
  const k = ease(Math.min(1, Math.max(0, t)))
  const steps = Math.max(1, Math.round(Math.abs(b.eye[0] - a.eye[0]) / 1.4))
  const bob = still ? 0 : 0.035 * Math.abs(Math.sin(k * steps * Math.PI))
  return {
    eye: [lerp(a.eye[0], b.eye[0], k), lerp(a.eye[1], b.eye[1], k) + bob, lerp(a.eye[2], b.eye[2], k)],
    look: [lerp(a.look[0], b.look[0], k), lerp(a.look[1], b.look[1], k), lerp(a.look[2], b.look[2], k)],
  }
}
