import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SimState } from '../../shared'
import { playSound } from '../audio'
import { sceneSpec } from '../scene3d/model'
import { rocketSpec } from '../scene3d/launch/vehicles'
import { ReadinessPanel } from '../readiness/ReadinessPanel'
import { engineeringReport } from '../readiness/report'
import { createInterceptScene, type InterceptScene } from './scene'
import { SHOTS, type ShotId } from './timeline'
import './intercept.css'

export interface InterceptViewProps {
  state: Pick<SimState, 'entities' | 'params'>
  onDone?: () => void
  /** Back to the design sandbox. The parent sends `reset`. */
  onDesign?: () => void
  reducedMotion?: boolean
  className?: string
}

const media = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches

export function InterceptView({ state, onDone, onDesign, reducedMotion, className }: InterceptViewProps) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<InterceptScene | null>(null)
  const still = reducedMotion ?? media('(prefers-reduced-motion: reduce)')
  const [shot, setShot] = useState<ShotId>('climb')
  const [debrief, setDebrief] = useState(still)
  const [noWebGL, setNoWebGL] = useState(false)
  const warned = useRef(false)

  const vehicle = state.entities.find((e) => e.kind === 'launch_vehicle' && e.id === state.params.launch_vehicle)
  const rocketKey = JSON.stringify(rocketSpec(vehicle))
  const craftKey = JSON.stringify(sceneSpec(state).craft)
  const rocket = useMemo(() => rocketSpec(vehicle), [rocketKey])
  const craft = useMemo(() => sceneSpec(state).craft, [craftKey])
  const report = useMemo(() => engineeringReport(state), [state.entities, state.params])
  const design = onDesign ?? onDone

  useEffect(() => {
    if (still) return
    let live: InterceptScene | null = null
    try {
      live = createInterceptScene(host.current!, {
        rocket, craft, reducedMotion: false,
        onFrame: (_t, id) => {
          setShot(id)
          if (!warned.current) {
            warned.current = true
            playSound('alarm')
          }
        },
        onEnd: () => setDebrief(true),
      })
      scene.current = live
      live.play()
    } catch {
      setNoWebGL(true)
      setDebrief(true)
    }
    return () => {
      live?.dispose()
      scene.current = null
    }
  }, [rocket, craft, still])

  const replay = useCallback((at = 0) => {
    setDebrief(false)
    setShot(at > 0 ? 'explosion' : 'climb')
    scene.current?.seek(at)
    scene.current?.play()
  }, [])

  const caption = SHOTS.find((item) => item.id === shot) ?? SHOTS[0]!
  const textOnly = still || noWebGL

  return (
    <section className={`s3d-intercept${className ? ` ${className}` : ''}`} aria-label="Hostile interception, a fictional launch film">
      {!textOnly && <div ref={host} className="s3d-intercept-canvas" role="img" aria-label="A stealth fighter closes on the ascending rocket." />}
      <div className="s3d-intercept-top">
        <p className="s3d-intercept-banner" role="alert">INTERCEPTION WARNING</p>
        <span className="s3d-intercept-buttons">
          {!debrief && <button type="button" onClick={() => { scene.current?.pause(); setDebrief(true) }}>Skip</button>}
        </span>
      </div>
      {!debrief && !textOnly && (
        <div className="s3d-intercept-caption">
          <p aria-live="polite"><strong>{caption.title}.</strong> {caption.caption}</p>
        </div>
      )}
      {(debrief || textOnly) && (
        <div className="s3d-intercept-debrief">
          <p className="s3d-intercept-kicker">MISSION TERMINATED</p>
          <h2>CAUSE: HOSTILE INTERCEPTION</h2>
          <p>MISSION STATUS: FAILED</p>
          <ul className="s3d-intercept-facts">
            <li><span>Mission duration</span>Lost during ascent</li>
            <li><span>Satellite status</span>{report.headline} · {report.readiness}%</li>
            <li><span>Rocket status</span>Broken up</li>
            <li><span>Payload integrity</span>Lost with the stack</li>
          </ul>
          <p>This film is a fictional story. It is rolled once per sandbox simulation and is not caused by the engineering check. {report.ready ? 'The design itself had no critical fault.' : 'The design also has engineering faults, listed below. Those are separate, and the sim applies them on a flight that is not intercepted.'}</p>
          {textOnly && (
            <ol>
              {SHOTS.map((item) => <li key={item.id}><strong>{item.title}.</strong> {item.caption}</li>)}
            </ol>
          )}
          <ReadinessPanel entities={state.entities} params={state.params} />
          <div className="s3d-intercept-actions">
            {!textOnly && <button type="button" onClick={() => replay(0)}>Replay the sequence</button>}
            {!textOnly && <button type="button" onClick={() => replay(16.8)}>Inspect the failure</button>}
            <button type="button" onClick={design}>Return to satellite design</button>
            <button type="button" onClick={design}>Retry the simulation</button>
          </div>
          <p className="s3d-intercept-note">Retry starts a new roll. Add <code>?intercept=1</code> to the page address to force the film, or <code>?intercept=0</code> to skip it. No weapon guidance is simulated.</p>
        </div>
      )}
    </section>
  )
}
