// The first-person story over each screen (decision 005): CAPCOM's line for the current beat, and
// the beat's cutscene once. Plain backgrounds for now; ui/scene3d's scenes go in as Cutscene children.
// Written by claude@aiden at Aiden's request ("wire it now").

import { useEffect, useRef, useState } from 'react'
import type { SimEvent } from '../shared'
import { CapcomPopout, Cutscene, LINES, storyBeat, type StoryScreen } from '../ui/story'

/** CAPCOM's line hides itself after this, so it never sits on top of a control for long. */
const LINE_MS = 9000

const NO_EVENTS: readonly SimEvent[] = []

export interface StoryLayerProps {
  screen: StoryScreen
  events?: readonly SimEvent[]
  scenarioId: string
  /** Told when a cutscene starts (true) and ends (false), e.g. to hold the mission clock. */
  onCutscene?: (playing: boolean) => void
}

export function StoryLayer({ screen, events = NO_EVENTS, scenarioId, onCutscene }: StoryLayerProps) {
  /** Beats whose cutscene has played on this screen. */
  const [played, setPlayed] = useState<string[]>([])
  /** The beat whose line was closed (or timed out). */
  const [closed, setClosed] = useState<string>()

  let beat = storyBeat(screen, events, scenarioId)
  // After the ending cutscene the results are on screen, so CAPCOM moves on to the debrief.
  if (beat.key === 'ending' && played.includes('ending')) beat = storyBeat('results', events, scenarioId)
  const cutscene = beat.cutscene && !played.includes(beat.key) ? beat.cutscene : undefined

  const told = useRef(onCutscene)
  told.current = onCutscene
  const playing = cutscene !== undefined
  useEffect(() => {
    told.current?.(playing)
  }, [playing])

  const key = beat.key
  useEffect(() => {
    if (playing) return
    const timer = setTimeout(() => setClosed(key), LINE_MS)
    return () => clearTimeout(timer)
  }, [key, playing])

  if (cutscene) {
    return <Cutscene key={key} id={cutscene} caption={LINES[beat.line]} onDone={() => setPlayed((p) => [...p, key])} />
  }
  if (closed === key) return null
  return <CapcomPopout key={key} line={beat.line} onClose={() => setClosed(key)} />
}
