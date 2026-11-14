import type { Params } from '../../shared'

export interface PersonalBest {
  score: number
  design: Params
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
}

/** Equal scores keep the first design; failed/blocked storage never prevents results rendering. */
// shortcut: simultaneous writes from multiple tabs are not coordinated; add coordination if cross-tab play is supported.
export function savePersonalBest(scenarioId: string, score: number, design: Params): SaveResult {
  if (!scenarioId.trim() || !Number.isFinite(score) || !validDesign(design)) return { best: null, stored: false }
  let best: PersonalBest = { score, design: { ...design } }
  const key = `space-apps-2026:best:v1:${encodeURIComponent(scenarioId)}`
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
