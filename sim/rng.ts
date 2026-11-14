// Seeded random numbers with the state passed in and out, so the sim stays pure.
// Algorithm: mulberry32. The state is a 32-bit integer, safe to keep in JSON.

export interface RandomResult {
  /** Uniform in [0, 1). */
  value: number
  /** Pass this to the next call. */
  state: number
}

export function nextRandom(state: number): RandomResult {
  const next = (state + 0x6d2b79f5) | 0
  let t = Math.imul(next ^ (next >>> 15), 1 | next)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: next }
}
