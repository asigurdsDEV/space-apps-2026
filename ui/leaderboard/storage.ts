import type { Params } from '../../shared'

export interface PersonalBest {
  score: number
  design: Params
  stars?: number
}

export interface RecordOptions {
  dailySeed?: number
  stars?: number
}

export interface SaveResult {
  best: PersonalBest | null
  stored: boolean
}

function validDesign(value: unknown): value is Params {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every((item) => typeof item === 'string' || typeof item === 'boolean'
      || (typeof item === 'number' && Number.isFinite(item)))
}

function validBest(value: unknown): value is PersonalBest {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const entry = value as Record<string, unknown>
  return typeof entry.score === 'number' && Number.isFinite(entry.score) && validDesign(entry.design)
    && (entry.stars === undefined || validStars(entry.stars))
}

function validStars(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3
}

/** Equal scores keep the first design; failed/blocked storage never prevents results rendering. */
// shortcut: simultaneous writes from multiple tabs are not coordinated; add coordination if cross-tab play is supported.
export function savePersonalBest(scenarioId: string, score: number, design: Params, { dailySeed, stars }: RecordOptions = {}): SaveResult {
  if (!scenarioId.trim() || !Number.isFinite(score) || !validDesign(design)) return { best: null, stored: false }
  if (stars !== undefined && !validStars(stars)) return { best: null, stored: false }
  if (dailySeed !== undefined && (!Number.isSafeInteger(dailySeed) || dailySeed < 0)) return { best: null, stored: false }
  let best: PersonalBest = { score, design: { ...design } }
  if (stars !== undefined) best.stars = stars
  // v2: scores are out of 1,000; v1 records (out of 100) are left alone and no longer read.
  const key = dailySeed === undefined
    ? `space-apps-2026:best:v2:${encodeURIComponent(scenarioId)}`
    : `space-apps-2026:daily-best:v2:${encodeURIComponent(scenarioId)}:${dailySeed}`
  try {
    const storage = globalThis.localStorage
    const raw = storage.getItem(key)
    let previous: unknown
    try { previous = JSON.parse(raw ?? 'null') } catch { previous = null }
    if (validBest(previous) && previous.score >= score) best = previous
    else storage.setItem(key, JSON.stringify(best))
    return { best, stored: true }
  } catch {
    return { best, stored: false }
  }
}
