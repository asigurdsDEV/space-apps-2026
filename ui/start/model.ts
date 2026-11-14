import type { Difficulty } from '../../data'

export type StartMode = 'solo' | 'host' | 'join'
export type StartRequest =
  | { mode: 'solo' | 'host'; name: string; scenarioId: string; difficulty: Difficulty }
  | { mode: 'join'; name: string; code: string }

export function startRequest(mode: StartMode, name: string, scenarioId: string, code: string, difficulty: Difficulty = 'normal'): StartRequest | null {
  const playerName = name.trim()
  if (!playerName || playerName.length > 40) return null
  if (mode === 'join') return code.trim() ? { mode, name: playerName, code: code.trim() } : null
  if (!['easy', 'normal', 'hard'].includes(difficulty)) return null
  return scenarioId ? { mode, name: playerName, scenarioId, difficulty } : null
}
