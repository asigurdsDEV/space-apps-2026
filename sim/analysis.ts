// What-if and risk helpers (GAME_DESIGN.md §4.3, decision 004): rerun the pure sim with one
// change, or with other seeds. Nothing here changes the rules; it only replays them.
// Written by claude@aiden at Aiden's request while claude@ethan was at his usage limit.
//
// Cost: one flown mission is a few hundred steps of pure functions, so ~40 what-if reruns or
// 50 seed reruns take well under a second in the browser. Call them once per debrief, not per frame.

import type { Command, Config, Dataset, Entity, Params, ParamValue, SimState, Summary } from '../shared'
import { instrumentIds, SLOTS } from './params'
import { catalogEntities } from './parts'
import { init, step, summary } from './sim'

/** One rerun with a single change. Same shape as `WhatIfFix` in ui/mission/game.ts (claude@sarah). */
export interface WhatIfFix {
  /** Plain words, e.g. "X-band transmitter instead of S-band patch antenna". */
  change: string
  score: number
  grade?: string
  outcome?: string
  /** The full design with the change, ready to load into the builder ("Try it"). */
  params: Params
}

/** Player design keys: the part slots, the instrument list and the ground stations. */
const DESIGN_KEYS = [...SLOTS.map((s) => s.key), 'instruments', 'ground_stations']
const MAX_STEPS = 100_000
const MAX_GROUND_STATIONS = 6 // same cap as sim/design.ts

/** The player's design out of a full params object (scenario settings are left to the config). */
export function designOf(params: Params): Params {
  const out: Params = {}
  for (const key of DESIGN_KEYS) if (params[key] !== undefined) out[key] = params[key]
  return out
}

/**
 * Flies `design` start to finish: init → set_param → launch → step until ended.
 * Returns null when the design can't launch (a blocking issue), since that's not a flown mission.
 */
export function flyMission(config: Config, datasets: Dataset[], design: Params): Summary | null {
  let state: SimState = init(config, datasets)
  const commands: Command[] = Object.entries(design).map(([key, value]) => ({ type: 'set_param', payload: { key, value } }))
  state = step(state, commands, config.dt_s).state
  state = step(state, [{ type: 'launch', payload: {} }], config.dt_s).state
  if (state.metrics.phase === 'design') return null
  for (let n = 0; state.status !== 'ended' && n < MAX_STEPS; n++) {
    // A what-if rerun has nobody to ask, so it takes the safe option (a) of every anomaly card.
    const decision_id = state.metrics.decision_id
    const answer: Command[] = decision_id ? [{ type: 'resolve_decision', payload: { decision_id: String(decision_id), option_id: 'a' } }] : []
    state = step(state, answer, config.dt_s).state
  }
  return summary(state)
}

const name = (parts: Entity[], id: ParamValue | undefined) => parts.find((p) => p.id === id)?.name ?? String(id ?? 'none')

/** Every design one change away: each other part in each slot (orbits around the same body), one instrument more or less, ±1 ground station. */
export function oneChangeDesigns(datasets: Dataset[], params: Params): { change: string; design: Params }[] {
  const design = designOf(params)
  const parts = catalogEntities(datasets)
  const out: { change: string; design: Params }[] = []

  // Orbits stay around the mission's own world: "fly to the Moon instead" is no fix for a Mars mission.
  const body = parts.find((p) => p.kind === 'orbit' && p.id === design.orbit)?.props.central_body
  for (const slot of SLOTS) {
    const options = parts.filter(
      (p) =>
        p.kind === slot.kind &&
        (!slot.types || slot.types.includes(String(p.props.type))) &&
        (slot.key !== 'orbit' || body === undefined || p.props.central_body === body),
    )
    for (const part of options) {
      if (part.id === design[slot.key]) continue
      const current = design[slot.key]
      out.push({
        change: current ? `${part.name} instead of ${name(parts, current)}` : `Add ${part.name}`,
        design: { ...design, [slot.key]: part.id },
      })
    }
  }

  const picked = instrumentIds(design)
  for (const part of parts.filter((p) => p.kind === 'instrument')) {
    const has = picked.includes(part.id)
    if (has && picked.length === 1) continue // a mission needs at least one instrument
    const next = has ? picked.filter((id) => id !== part.id) : [...picked, part.id]
    out.push({ change: has ? `Drop the ${part.name}` : `Add the ${part.name}`, design: { ...design, instruments: next.join(',') } })
  }

  const stations = typeof design.ground_stations === 'number' ? design.ground_stations : 1
  for (const n of [stations + 1, stations - 1]) {
    if (n < 1 || n > MAX_GROUND_STATIONS) continue
    out.push({ change: `${n} ground station${n === 1 ? '' : 's'} instead of ${stations}`, design: { ...design, ground_stations: n } })
  }
  return out
}

/**
 * The flown mission rerun with every single change, same seed (so it's a fair comparison).
 * Designs that can't launch are left out. Sorted best score first; ui/mission's `bestFixes`
 * then keeps the ones that beat the real score.
 * shortcut: anomaly-card choices aren't replayed yet (they don't exist in the sim); add a
 * `choices` argument when `resolve_decision` lands.
 */
export function whatIf(config: Config, datasets: Dataset[], params: Params): WhatIfFix[] {
  const fixes: WhatIfFix[] = []
  for (const { change, design } of oneChangeDesigns(datasets, params)) {
    const result = flyMission(config, datasets, design)
    if (!result) continue
    fixes.push({ change, score: Number(result.score) || 0, grade: String(result.grade ?? ''), outcome: String(result.outcome ?? ''), params: design })
  }
  return fixes.sort((a, b) => b.score - a.score)
}

/**
 * Share of `runs` flights of this design that end in `success`, each with a different seed
 * (seed, seed+1, …). Only random parts of the sim differ between runs, so with random
 * failures and events off every run is the same and the answer is 0 or 1.
 * Returns null when the design can't launch.
 */
export function successRate(config: Config, datasets: Dataset[], params: Params, runs = 50): number | null {
  const design = designOf(params)
  let wins = 0
  for (let i = 0; i < runs; i++) {
    const result = flyMission({ ...config, seed: (config.seed + i) | 0 }, datasets, design)
    if (!result) return null
    if (result.outcome === 'success') wins++
  }
  return runs > 0 ? wins / runs : null
}
