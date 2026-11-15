/** Screen time for the fictional interception film. Slow shots are longer on the clock and the scene plays them slower. */
export const SHOTS = [
  { id: 'climb', start: 0, end: 4.2, title: 'Unexpected aircraft', caption: 'Something is climbing with the rocket.' },
  { id: 'reveal', start: 4.2, end: 8.2, title: 'Fighter alongside', caption: 'A dark stealth fighter draws level with the stack.' },
  { id: 'release', start: 8.2, end: 13.4, title: 'Missile release', caption: 'A missile leaves the wing in slow motion.' },
  { id: 'intercept', start: 13.4, end: 16.8, title: 'Closing in', caption: 'The missile runs in toward the rocket.' },
  { id: 'explosion', start: 16.8, end: 22, title: 'Interception', caption: 'The rocket breaks up. No one is aboard.' },
] as const

export type ShotId = (typeof SHOTS)[number]['id']

export const INTERCEPT_DURATION = SHOTS[SHOTS.length - 1]!.end

/** How fast the film clock runs during this shot. Release and the blast are the slow-motion highlights. */
export function timeScale(id: ShotId): number {
  if (id === 'release' || id === 'explosion') return 0.38
  if (id === 'intercept') return 0.72
  return 1
}

export function shotAt(t: number): (typeof SHOTS)[number] {
  return SHOTS.find((shot) => t < shot.end) ?? SHOTS[SHOTS.length - 1]!
}

/** 0 at the start of the shot, 1 at the end. */
export function shotProgress(t: number): number {
  const shot = shotAt(t)
  return Math.min(1, Math.max(0, (t - shot.start) / (shot.end - shot.start)))
}

/**
 * Where the missile is along a path chosen when the film was written.
 * It creeps away from the wing, then runs. This is a picture timeline, not a guidance law.
 */
export function missileAlong(t: number): number {
  const shot = shotAt(t)
  const u = shotProgress(t)
  if (shot.id === 'climb' || shot.id === 'reveal') return 0
  if (shot.id === 'release') return u * u * 0.34
  if (shot.id === 'intercept') return 0.34 + (1 - (1 - u) * (1 - u)) * 0.66
  return 1
}
