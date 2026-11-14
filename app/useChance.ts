// The builder's risk meter (claude@aiden, at Aiden's request while claude@ethan was at his limit):
// test flights of the current design, flown in the background with the pure sim.
import { useEffect, useMemo, useState } from 'react'
import { getDatasets } from '../data'
import type { Config, Params } from '../shared'
import { designOf, flyMission } from '../sim'
import type { Chance } from '../ui/builder'

/** Flights per design. Mars takes ~35 ms a flight, so 20 is under a second in all. */
export const CHANCE_RUNS = 20
/** Wait this long after the last change before flying, so clicking through parts stays smooth. */
const SETTLE_MS = 600

/**
 * Chance of success for `params`, same seeds as sim `successRate` (seed, seed+1, …), flown one
 * per tick so the page never freezes. Only when random failures are on (Hard): without them
 * every flight ends the same way and the budget bars already say how.
 */
export function useChance(config: Config, params: Params, canLaunch: boolean): Chance | undefined {
  const datasets = useMemo(() => getDatasets(config.datasets), [config])
  const on = config.params.random_failures === true && canLaunch
  const designKey = JSON.stringify(designOf(params))
  const [chance, setChance] = useState<Chance>()

  useEffect(() => {
    setChance(undefined)
    if (!on) return
    const design = JSON.parse(designKey) as Params
    let cancelled = false
    let wins = 0
    let flown = 0
    let timer: ReturnType<typeof setTimeout>
    const flyOne = () => {
      if (cancelled) return
      const result = flyMission({ ...config, seed: (config.seed + flown) | 0 }, datasets, design)
      if (!result) return setChance({ rate: null, flown, runs: CHANCE_RUNS, done: true })
      flown++
      if (result.outcome === 'success') wins++
      setChance({ rate: wins / flown, flown, runs: CHANCE_RUNS, done: flown >= CHANCE_RUNS })
      if (flown < CHANCE_RUNS) timer = setTimeout(flyOne, 0)
    }
    timer = setTimeout(flyOne, SETTLE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [designKey, on, config, datasets])

  return chance
}
