// The sandbox's rare launch events, on the real launch sequence (ui/scene3d/launch): the fictional interception (an F-22
// fires a missile and the rocket blows up) or the lightning strike (it launches into a thunderstorm and a bolt hits it).
// Then a debrief with the design's engineering check.
import { useMemo, useState } from 'react'
import type { SimState } from '../../shared'
import { LaunchView } from '../scene3d/launch/LaunchView'
import { launchTimeline } from '../scene3d/launch/timeline'
import { rocketSpec } from '../scene3d/launch/vehicles'
import { ReadinessPanel } from '../readiness/ReadinessPanel'
import { engineeringReport } from '../readiness/report'
import './intercept.css'

export interface InterceptViewProps {
  /** Which event: the F-22 interception (the default) or the lightning strike. */
  event?: 'intercept' | 'lightning'
  state: Pick<SimState, 'entities' | 'params'>
  onDone?: () => void
  /** Back to the design sandbox. The parent sends `reset`. */
  onDesign?: () => void
  reducedMotion?: boolean
  className?: string
}

export function InterceptView({ event = 'intercept', state, onDone, onDesign, reducedMotion, className }: InterceptViewProps) {
  const [debrief, setDebrief] = useState(false)
  // A new key remounts the launch: replay from the top, or from the interception shot.
  const [take, setTake] = useState({ n: 0, from: 0 })
  const report = useMemo(() => engineeringReport(state), [state.entities, state.params])
  const vehicle = state.entities.find((e) => e.kind === 'launch_vehicle' && e.id === state.params.launch_vehicle)
  const storm = event === 'lightning'
  const story = useMemo(() => launchTimeline(rocketSpec(vehicle), { intercepted: !storm, struck: storm }), [vehicle, storm])
  // "Watch it again" starts at the interception shot, or at lift-off into the storm.
  const again = story.stages.find((s) => s.id === (storm ? 'liftoff' : 'intercept'))?.start ?? 0
  const design = onDesign ?? onDone
  const replay = (from: number) => {
    setTake((t) => ({ n: t.n + 1, from }))
    setDebrief(false)
  }

  return (
    <section className={`s3d-intercept${className ? ` ${className}` : ''}`} aria-label={storm ? 'Lightning strike at launch' : 'Hostile interception, a fictional launch film'}>
      {!debrief && (
        <LaunchView key={take.n} className="s3d-intercept-canvas" state={state} startAt={take.from}
          intercepted={!storm} struck={storm} reducedMotion={reducedMotion} onDone={() => setDebrief(true)} />
      )}
      {debrief && (
        <div className="s3d-intercept-debrief">
          <p className="s3d-intercept-kicker">MISSION TERMINATED</p>
          <h2>CAUSE: {storm ? 'LIGHTNING STRIKE' : 'HOSTILE INTERCEPTION'}</h2>
          <p>MISSION STATUS: FAILED</p>
          <ul className="s3d-intercept-facts">
            <li><span>Mission duration</span>Lost during ascent</li>
            <li><span>Satellite status</span>{report.headline} · {report.readiness}%</li>
            <li><span>Rocket status</span>Broken up</li>
            <li><span>Payload integrity</span>Lost with the stack</li>
          </ul>
          <p>{storm
            ? 'Launching into a thunderstorm is a real danger: lightning destroyed an Atlas-Centaur in 1987, and Apollo 12 was struck twice in 1969. Real launch teams wait for storms to pass. Here the storm is rolled once per sandbox simulation and is not caused by the engineering check.'
            : 'This film is a fictional story: no launch has ever been shot down. It is rolled once per sandbox simulation and is not caused by the engineering check.'} {report.ready ? 'The design itself had no critical fault.' : 'The design also has engineering faults, listed below. Those are separate, and the sim applies them on a flight that is not intercepted.'}</p>
          <ReadinessPanel entities={state.entities} params={state.params} />
          <div className="s3d-intercept-actions">
            <button type="button" onClick={() => replay(0)}>Replay the sequence</button>
            <button type="button" onClick={() => replay(again)}>{storm ? 'Watch the strike again' : 'Watch the interception again'}</button>
            <button type="button" onClick={design}>Return to satellite design</button>
            <button type="button" onClick={design}>Retry the simulation</button>
          </div>
          <p className="s3d-intercept-note">Retry starts a new roll. Add <code>?intercept=1</code> or <code>?lightning=1</code> to the page address to force one, or <code>=0</code> to skip it.{storm ? '' : ' No weapon guidance is simulated.'}</p>
        </div>
      )}
    </section>
  )
}
