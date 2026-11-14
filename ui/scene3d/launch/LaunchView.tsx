import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SimState } from '../../../shared'
import { sceneSpec } from '../model'
import { createLaunchScene, type LaunchScene } from './scene'
import { formatMissionTime, launchTimeline, missionTime, stageAt, stillTime } from './timeline'
import { rocketSpec } from './vehicles'
import './launch.css'

export interface LaunchViewProps {
  /** Reads the picked launch vehicle and spacecraft parts (params) and their catalog rows (entities). Never sends commands. */
  state: Pick<SimState, 'entities' | 'params'>
  /** Called once, when the sequence ends or the player skips it. */
  onDone?: () => void
  /** The sim reported outcome "launch_failure": the sequence ends with the rocket lost instead of reaching orbit. */
  failed?: boolean
  /** Sizes the view; the default height is in launch.css. */
  className?: string
  /** Step through still frames instead of playing. Default: the system's "reduce motion" setting. */
  reducedMotion?: boolean
  /** Screen time (seconds) to start at. For the preview page. */
  startAt?: number
  /** Start frozen. For the preview page. */
  paused?: boolean
}

const media = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches

export function LaunchView({ state, onDone, failed = false, className, reducedMotion, startAt = 0, paused = false }: LaunchViewProps) {
  const host = useRef<HTMLDivElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const scene = useRef<LaunchScene | null>(null)
  const still = reducedMotion ?? media('(prefers-reduced-motion: reduce)')

  const vehicle = state.entities.find((e) => e.kind === 'launch_vehicle' && e.id === state.params.launch_vehicle)
  // Keyed by value: the app may hand over a new state object every sim step, and that must not restart the launch.
  const rocketKey = JSON.stringify(rocketSpec(vehicle))
  const craftKey = JSON.stringify(sceneSpec(state).craft)
  const rocket = useMemo(() => rocketSpec(vehicle), [rocketKey])
  const timeline = useMemo(() => launchTimeline(rocket, { failed }), [rocket, failed])
  const craft = useMemo(() => sceneSpec(state).craft, [craftKey])
  const stages = timeline.stages

  const first = stages.indexOf(stageAt(timeline, startAt))
  const [index, setIndex] = useState(first)
  const [playing, setPlaying] = useState(!paused && !still)
  const [ended, setEnded] = useState(false)
  const [noWebGL, setNoWebGL] = useState(false)

  const done = useRef(false)
  const [isDone, setIsDone] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    setIsDone(true)
    onDoneRef.current?.()
  }, [])

  // One scene per vehicle and design; play, pause and seek go through the effects below.
  useEffect(() => {
    let live: LaunchScene | null = null
    try {
      live = createLaunchScene(host.current!, {
        rocket, craft, timeline,
        reducedMotion: still,
        startAt: still ? stillTime(stages[first]!) : startAt,
        onFrame: (t) => {
          if (clock.current) clock.current.textContent = formatMissionTime(missionTime(timeline, t))
          setIndex(stages.indexOf(stageAt(timeline, t)))
        },
        onEnd: () => {
          setEnded(true)
          setPlaying(false)
          finish()
        },
      })
      scene.current = live
    } catch {
      setNoWebGL(true)
    }
    return () => {
      live?.dispose()
      scene.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rocket, craft, timeline, still])
  useEffect(() => {
    if (playing) scene.current?.play()
    else scene.current?.pause()
  }, [playing, rocket, craft, timeline])

  const stage = stages[index] ?? stages[0]!
  const last = index >= stages.length - 1
  const step = (to: number) => {
    setIndex(to)
    scene.current?.seek(stillTime(stages[to]!))
  }
  const replay = () => {
    setEnded(false)
    scene.current?.seek(0)
    setPlaying(true)
  }
  const cls = `s3d-launch${className ? ` ${className}` : ''}`

  if (noWebGL) {
    return (
      <section className={`${cls} is-text`} aria-label={`Launch of ${rocket.name}`}>
        <p>The 3D launch needs WebGL, which is turned off in this browser. Here is what happens:</p>
        <ol>
          {stages.map((s) => <li key={s.id}><strong>{s.title}.</strong> {s.detail}</li>)}
        </ol>
        <button type="button" className="s3d-launch-button is-primary" onClick={finish}>Continue</button>
      </section>
    )
  }

  return (
    <figure className={cls}>
      <div ref={host} className="s3d-launch-canvas" role="img" aria-label={`3D view of ${rocket.name} launching your spacecraft.`} />
      <div className="s3d-launch-top">
        {/* The clock changes every frame, so it stays out of the live region. */}
        <span ref={clock} className="s3d-launch-clock" aria-hidden="true">{formatMissionTime(missionTime(timeline, startAt))}</span>
        <span className="s3d-launch-name">{rocket.name}</span>
        <span className="s3d-launch-buttons">
          {still ? (
            <>
              {index > 0 && <button type="button" className="s3d-launch-button" onClick={() => step(index - 1)}>Back</button>}
              {!(last && isDone) && <button type="button" className="s3d-launch-button is-primary" onClick={() => (last ? finish() : step(index + 1))}>{last ? 'Continue' : 'Next'}</button>}
            </>
          ) : ended ? (
            <button type="button" className="s3d-launch-button" onClick={replay}>Replay</button>
          ) : (
            <button type="button" className="s3d-launch-button" aria-pressed={!playing} onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
          )}
          {!(still && last) && !isDone && <button type="button" className="s3d-launch-button" onClick={finish}>Skip</button>}
        </span>
      </div>
      <figcaption className="s3d-launch-caption">
        <ol className="s3d-launch-steps" aria-hidden="true">
          {stages.map((s, i) => <li key={s.id} className={i === index ? 'is-now' : i < index ? 'is-done' : undefined} />)}
        </ol>
        <p aria-live="polite" aria-atomic="true">
          <strong>{stage.title}</strong>
          {/* Playing: one short line per shot. Paused or stepping: the full explanation. */}
          <span>{playing ? stage.caption : stage.detail}</span>
        </p>
      </figcaption>
    </figure>
  )
}
