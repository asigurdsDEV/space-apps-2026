/** Chance a sandbox simulation plays the fictional interception film. Change this to retune the rate. */
export const INTERCEPTION_PROBABILITY = 0.2

export interface InterceptionRun {
  /** The seed this run rolled with. A new simulation uses a new seed. */
  seed: number
  /** True once. Later frames must keep this object instead of rolling again. */
  triggered: boolean
}

/** Uniform value in [0, 1) from an integer seed. The same seed always returns the same value. */
export function unitInterval(seed: number): number {
  let t = Math.imul(Math.floor(seed) ^ 0x9e3779b9, 0x85ebca6b)
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35)
  t = (t ^ (t >>> 16)) >>> 0
  return t / 4294967296
}

/** True when this seed falls inside `probability`. Not a guidance or targeting calculation. */
export function interceptionTriggered(seed: number, probability = INTERCEPTION_PROBABILITY): boolean {
  return unitInterval(seed) < probability
}

/**
 * Roll once for a simulation. `force` is the test hook: true always plays the film, false never does.
 * The sandbox scenario's own seed is always 1, so callers pass a fresh seed per simulation.
 */
export function openInterception(seed: number, probability = INTERCEPTION_PROBABILITY, force?: boolean): InterceptionRun {
  return { seed, triggered: force ?? interceptionTriggered(seed, probability) }
}

/** The roll already happened. Ignore any later seed so the film cannot fire twice in one simulation. */
export function keepInterception(run: InterceptionRun): InterceptionRun {
  return run
}

/** `?intercept=1` or `?intercept=0` on the page, so the film can be checked without waiting on the roll. */
export function interceptOverride(): boolean | undefined {
  if (typeof window === 'undefined') return undefined
  const value = new URLSearchParams(window.location.search).get('intercept')
  if (value === '1') return true
  if (value === '0') return false
  return undefined
}

export function isSandboxScenario(scenarioId: string | undefined): boolean {
  return (scenarioId ?? '').replace(/-(easy|hard)$/, '') === 'sandbox'
}
