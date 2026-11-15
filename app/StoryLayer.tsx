// The first-person story over each screen (decision 005): CAPCOM's line for the current beat, and
// the beat's cutscene once, with its 3D scene from ui/cutscenes (cursor@caleb) inside the frame.
// Written by claude@aiden at Aiden's request ("wire it now").

import { useEffect, useMemo, useRef, useState } from 'react'
import type { SimEvent, SimState } from '../shared'
// The index, not ./canvas: three.js stays out of the first download.
import { AnomalyScene, ArrivalScene, EndingScene, OrbitArrivalScene } from '../ui/cutscenes'
import { sceneSpec, type CraftSpec } from '../ui/scene3d/model'
import { Scenery } from './Walk'
import { story } from '../ui/audio/moments'
import { CapcomPopout, Cutscene, CUTSCENE_MS, LINES, storyBeat, worldOf, type CutsceneId, type StoryScreen } from '../ui/story'

/** The 3D scene for a cutscene. Launch has none here: the app plays ui/scene3d's own (see `shown`), so its frame keeps the still. */
/** The 3D scene for a cutscene, with the player's own spacecraft where the scene shows one. */
function sceneFor(id: CutsceneId, scenarioId: string, craft?: CraftSpec) {
  const durationMs = CUTSCENE_MS[id]
  if (id === 'arrival') return <ArrivalScene durationMs={durationMs} />
  if (id === 'orbit') return <OrbitArrivalScene body={worldOf(scenarioId) === 'mars' ? 'mars' : 'moon'} durationMs={durationMs} craft={craft} />
  if (id === 'anomaly') return <AnomalyScene durationMs={durationMs} craft={craft} />
  if (id === 'ending-success') return <EndingScene outcome="success" durationMs={durationMs} craft={craft} />
  if (id === 'ending-loss') return <EndingScene outcome="loss" durationMs={durationMs} craft={craft} />
  return null
}

/** CAPCOM's line hides itself after this, so it never sits on top of a control for long. */
const LINE_MS = 6000

const NO_EVENTS: readonly SimEvent[] = []

export interface StoryLayerProps {
  screen: StoryScreen
  events?: readonly SimEvent[]
  scenarioId: string
  /** The design flown (parts and params): the orbit, alarm and ending cutscenes show this spacecraft. Default: a small generic craft. */
  design?: Pick<SimState, 'entities' | 'params'>
  /** Told when a cutscene starts (true) and ends (false), e.g. to hold the mission clock. */
  onCutscene?: (playing: boolean) => void
  /** Cutscenes the app already showed itself (the 3D launch), so the plain one is not played again. */
  shown?: readonly string[]
  /** First-person radio subtitle, with no menu/button over the scene. */
  immersive?: boolean
  /** CAPCOM's live reply to the last design choice; wins over the beat line. */
  callout?: { key: string; text: string } | null
}

const CALLOUT_MS = 5000

export function StoryLayer({ screen, events = NO_EVENTS, scenarioId, design, onCutscene, shown, immersive = false, callout }: StoryLayerProps) {
  // Parts don't change in flight; the state object does, every sim step.
  const craft = useMemo(() => (design ? sceneSpec(design).craft : undefined), [design?.entities, design?.params])
  /** The pointer is over CAPCOM's pop-out or focus is in it: don't close it under the player. */
  const [held, setHeld] = useState(false)
  const [calloutClosed, setCalloutClosed] = useState<string | null>(null)
  const calloutKey = callout?.key ?? null
  useEffect(() => {
    if (!calloutKey || held) return
    const timer = setTimeout(() => setCalloutClosed(calloutKey), CALLOUT_MS)
    return () => clearTimeout(timer)
  }, [calloutKey, held])
  /** Beats whose cutscene has played on this screen. */
  const [played, setPlayed] = useState<string[]>([])
  /** The beat whose line was closed (or timed out). */
  const [closed, setClosed] = useState<string>()

  let beat = storyBeat(screen, events, scenarioId)
  // After the ending cutscene the results are on screen, so CAPCOM moves on to the debrief.
  if (beat.key === 'ending' && played.includes('ending')) beat = storyBeat('results', events, scenarioId)
  const cutscene = beat.cutscene && !played.includes(beat.key) && !shown?.includes(beat.cutscene) ? beat.cutscene : undefined

  const told = useRef(onCutscene)
  told.current = onCutscene
  const playing = cutscene !== undefined
  useEffect(() => {
    told.current?.(playing)
  }, [playing])

  const key = beat.key
  useEffect(() => {
    if (playing || held) return // hovered or focused: it stays; the timer starts again when the player lets go
    const timer = setTimeout(() => setClosed(key), LINE_MS)
    return () => clearTimeout(timer)
  }, [key, playing, held])

  useEffect(() => story(cutscene, key, cutscene || closed !== key ? key : null))

  if (cutscene) {
    return (
      <Cutscene key={key} id={cutscene} caption={LINES[beat.line]} onDone={() => setPlayed((p) => [...p, key])}>
        {/* A scene that cannot load leaves the caption and Skip working. */}
        <Scenery>{sceneFor(cutscene, scenarioId, craft)}</Scenery>
      </Cutscene>
    )
  }
  const live = callout && calloutClosed !== callout.key ? callout : null
  if (!live && closed === key) return null
  if (immersive) return (
    <aside key={live?.key ?? key} className="app-world-radio" role="status" aria-live="polite" aria-label="CAPCOM">
      <span>CAPCOM</span><p>{live?.text ?? LINES[beat.line]}</p>
    </aside>
  )
  // Closing unmounts it with no mouseleave / blur, so let go of the hold too.
  if (live) return <CapcomPopout key={live.key} text={live.text} onHold={setHeld} onClose={() => (setHeld(false), setCalloutClosed(live.key))} />
  return <CapcomPopout key={key} line={beat.line} onHold={setHeld} onClose={() => (setHeld(false), setClosed(key))} />
}
