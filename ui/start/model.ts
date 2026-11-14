export type StartMode = 'solo' | 'host' | 'join'
export type StartRequest =
  | { mode: 'solo' | 'host'; name: string; scenarioId: string }
  | { mode: 'join'; name: string; code: string }

export function startRequest(mode: StartMode, name: string, scenarioId: string, code: string): StartRequest | null {
  const playerName = name.trim()
  if (!playerName || playerName.length > 40) return null
  if (mode === 'join') return code.trim() ? { mode, name: playerName, code: code.trim() } : null
  return scenarioId ? { mode, name: playerName, scenarioId } : null
}
