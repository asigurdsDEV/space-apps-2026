export interface DailyMission {
  date: string
  scenarioId: string
  seed: number
  difficulty: 'normal'
}
export type DailyMissionRequest = DailyMission & { name: string }

/** UTC is shared across time zones; catalog display order must not change the draw. */
export function dailyMissionForDate(date: Date, scenarioIds: readonly string[]): DailyMission | null {
  if (!Number.isFinite(date.getTime())) return null
  const day = date.toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const ids = [...new Set(scenarioIds.filter(Boolean))].sort()
  if (!ids.length) return null
  const seed = Number(day.replaceAll('-', ''))
  return { date: day, scenarioId: ids[seed % ids.length], seed, difficulty: 'normal' }
}
