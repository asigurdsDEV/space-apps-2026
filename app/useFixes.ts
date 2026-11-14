// The debrief's "what would have fixed it": the flown mission rerun with one change each
// (sim/analysis.ts whatIf). Written by claude@aiden while claude@ethan was at his usage limit.

import { useEffect, useMemo, useState } from 'react'
import { getDatasets } from '../data'
import type { Config, Params, SimEvent } from '../shared'
import { choicesOf, designOf, whatIf, type Choices, type WhatIfFix } from '../sim'

/**
 * `whatIf` for the flown design once the mission has ended, undefined until then. `config` must be
 * the one the game flew (seed and anomaly cards included); the player's card answers come from
 * `events`. It takes up to ~1 s, so it runs after the results screen has painted.
 */
export function useFixes(config: Config, params: Params, events: readonly SimEvent[], ended: boolean): WhatIfFix[] | undefined {
  const [fixes, setFixes] = useState<WhatIfFix[]>()
  const datasets = useMemo(() => getDatasets(config.datasets), [config.datasets])
  const designKey = JSON.stringify(designOf(params))
  const choicesKey = ended ? JSON.stringify(choicesOf(events)) : ''
  useEffect(() => {
    setFixes(undefined)
    if (!ended) return
    const run = () => setFixes(whatIf(config, datasets, JSON.parse(designKey) as Params, JSON.parse(choicesKey) as Choices))
    const timer = setTimeout(run)
    return () => clearTimeout(timer)
  }, [config, datasets, designKey, choicesKey, ended])
  return fixes
}
