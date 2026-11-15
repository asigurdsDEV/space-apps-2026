// Dev-only preview: `npm run dev`, then open /ui/scene3d/launch/preview.html. Not part of the build.
// Query: ?vehicle=<id>&t=<seconds>&paused=1 freezes the sequence at a screen time; &failed=1 plays the failure
// ending; &still=1 forces the reduced-motion stepper; &bus=, &solar=, &comms=, &instruments=a,b, &orbit= pick the spacecraft.
// &w=390&h=780 draws the view in a box that size (headless Chrome cannot make a window narrower than about 500 px).
// ?lineup=all (or a list of ids) shows the rockets side by side at true scale instead; &yaw=, &pitch= (degrees),
// &zoom=, &cx=, &cy= (0 to 1) move the camera for close-ups.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getDatasets, scenarios } from '../../../data'
import { catalogEntities } from '../../../sim/parts'
import type { Params } from '../../../shared'
import { showHangar } from './hangar'
import { LaunchView } from './LaunchView'
import { sceneSpec } from '../model'
import { launchTimeline } from './timeline'
import { KNOWN, rocketSpec } from './vehicles'

const query = new URLSearchParams(location.search)
const entities = catalogEntities(getDatasets())
// Rockets that are modelled but have no catalog row yet get a stand-in row here, so they can be previewed.
for (const id of Object.keys(KNOWN)) {
  if (!entities.some((e) => e.id === id)) entities.push({ id, kind: 'launch_vehicle', name: id, props: { reliability: 0.95 } })
}
const params: Params = { ...scenarios[0]!.params }
for (const key of ['bus', 'solar', 'comms', 'instruments', 'orbit'] as const) {
  const v = query.get(key)
  if (v !== null) params[key] = v
}
params.launch_vehicle = query.get('vehicle') ?? String(params.launch_vehicle ?? 'falcon-9')
const vehicles = entities.filter((e) => e.kind === 'launch_vehicle')
const shot = launchTimeline(rocketSpec(vehicles.find((v) => v.id === params.launch_vehicle))).stages.find((s) => s.id === query.get('stage'))
const startAt = shot ? shot.start + (shot.end - shot.start) * Number(query.get('p') ?? 0.5) : Number(query.get('t') ?? 0) || 0

function Preview() {
  const [doneCount, setDoneCount] = useState(0)
  const go = (key: string, value: string) => {
    const next = new URLSearchParams(location.search)
    next.set(key, value)
    location.search = next.toString()
  }
  return (
    <>
      <LaunchView
        state={{ entities, params }}
        failed={query.get('failed') === '1'}
        paused={query.get('paused') === '1'}
        startAt={startAt}
        reducedMotion={query.get('still') === '1' ? true : undefined}
        onDone={() => setDoneCount((n) => n + 1)}
        className="preview-full"
      />
      {query.get('w') && <style>{`.preview-full { width: ${Number(query.get('w'))}px; height: ${Number(query.get('h') ?? 780)}px; }`}</style>}
      {query.get('ui') !== '0' && (
        <div className="preview-bar">
          <select value={String(params.launch_vehicle)} onChange={(ev) => go('vehicle', ev.target.value)} aria-label="Launch vehicle">
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            <option value="unknown-heavy">Unknown id (generic)</option>
          </select>
          <span>onDone called: {doneCount}</span>
        </div>
      )}
    </>
  )
}

const lineup = query.get('lineup')
if (lineup) {
  const ids = lineup === 'all' ? [...Object.keys(KNOWN), 'unknown'] : lineup.split(',')
  const num = (key: string, fallback: number) => Number(query.get(key) ?? fallback)
  showHangar(document.getElementById('root')!, ids.map((id) => rocketSpec(entities.find((e) => e.id === id) ?? { id, name: id, props: { payload_leo_kg: 8000 } })), {
    yaw: num('yaw', 14), pitch: num('pitch', 4), zoom: num('zoom', 1), cx: num('cx', 0.5), cy: num('cy', 0.5),
  }, query.get('open') ? sceneSpec({ entities, params }).craft : undefined, query.get('open') === '2')
} else {
  createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
}
