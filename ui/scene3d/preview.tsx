// Dev-only preview: `npm run dev`, then open /ui/scene3d/preview.html. Not part of the build.
// It flies the real sim on the real data/ catalogs, so what shows is what the game would pass in.
// Every state can be reached from the address bar, for screenshots:
//   scenario=demo|moon|mars   orbit, bus, solar, battery, comms, instruments, launch_vehicle = catalog ids
//   mode=orbit|spacecraft     t=<sim seconds since launch> (launches the design; without it: design phase)
//   speed=<sim seconds per real second> (0 = still)      stations=1..6      highlight=<family or id>
//   phase=cruise|operations|ended and outcome=success|science_shortfall|launch_failure|spacecraft_failure
//     (patched on top of the sim's state, for looks the sim would take a long flight to reach)
//   quality=auto|high|low     stats=1 (draw calls and triangles)     bare=1 (the view only)
import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getDatasets, getScenario } from '../../data'
import type { Entity, SimState } from '../../shared'
import { init, step } from '../../sim'
import { SpaceView } from './SpaceView'
import type { QualityChoice, ViewMode } from './world'

const query = new URLSearchParams(location.search)
const base = getScenario(query.get('scenario') ?? 'demo') ?? getScenario('demo')!
const stations = Number(query.get('stations'))
// The sim only counts extra stations when they cost something.
const config = { ...base, params: { ...base.params, ...(stations > 0 ? { ground_stations: stations, ground_station_cost_usd_per_day: 1 } : {}) } }
const datasets = getDatasets(config.datasets)
const SLOTS = ['orbit', 'bus', 'solar', 'battery', 'comms', 'launch_vehicle', 'instruments'] as const
const FAMILIES = ['', 'bus', 'power', 'comms', 'instrument']

/** The sim's own state for these picks: in design, or launched and flown to `t_s`. */
function fly(picks: Record<string, string>, t_s: number | undefined): { state: SimState; note: string } {
  let state = init(config, datasets)
  for (const [key, value] of Object.entries(picks)) state = step(state, [{ type: 'set_param', payload: { key, value } }], config.dt_s).state
  if (t_s === undefined) return { state, note: '' }
  const launch = step(state, [{ type: 'launch', payload: {} }], config.dt_s)
  state = launch.state
  let note = ''
  if (state.metrics.phase === 'design') {
    // The sim refused the launch. Show the design flying anyway, and say so.
    note = `The sim refused this launch (${state.issues.filter((i) => i.severity === 'error').map((i) => i.code).join(', ')}): phase and time are patched in.`
    state = { ...state, t_s, metrics: { ...state.metrics, phase: 'operations', outcome: 'in_flight', mission_day: t_s / 86_400 } }
  } else if (t_s > 0) state = step(state, [], t_s).state
  const phase = query.get('phase')
  const outcome = query.get('outcome')
  if (phase || outcome) {
    const ended = (phase ?? state.metrics.phase) === 'ended'
    state = { ...state, status: ended ? 'ended' : 'running', metrics: { ...state.metrics, ...(phase ? { phase } : {}), ...(outcome ? { outcome } : {}) } }
  }
  return { state, note }
}

function Preview() {
  const [mode, setMode] = useState<ViewMode>(query.get('mode') === 'spacecraft' ? 'spacecraft' : 'orbit')
  const [picks, setPicks] = useState<Record<string, string>>(() => Object.fromEntries(SLOTS.flatMap((k) => (query.has(k) ? [[k, query.get(k)!]] : []))))
  const [t, setT] = useState<number | undefined>(query.has('t') ? Number(query.get('t')) || 0 : undefined)
  const [speed, setSpeed] = useState(Number(query.get('speed')) || 0)
  const [paused, setPaused] = useState(false)
  const [highlight, setHighlight] = useState(query.get('highlight') ?? '')
  const [stats, setStats] = useState('')
  const { state, note } = useMemo(() => fly(picks, t), [picks, t])

  // A stand-in for the app's loop: ten sim steps a second.
  useEffect(() => {
    if (!speed || paused || t === undefined) return
    const id = setInterval(() => setT((now) => (now ?? 0) + speed / 10), 100)
    return () => clearInterval(id)
  }, [speed, paused, t === undefined])
  useEffect(() => {
    if (!query.has('stats')) return
    const id = setInterval(() => setStats(document.querySelector<HTMLElement>('.s3d-canvas')?.dataset.stats ?? ''), 500)
    return () => clearInterval(id)
  }, [])

  const set = (key: string, value: string) => setPicks((p) => ({ ...p, [key]: value }))
  const of = (kind: string, where?: (x: Entity) => boolean) => state.entities.filter((x) => x.kind === kind && (!where || where(x)))
  const picked = String(state.params.instruments ?? '').split(',').filter(Boolean)
  const select = (key: string, options: Entity[]) => (
    <label>
      {key}{' '}
      <select value={String(state.params[key] ?? '')} onChange={(ev) => set(key, ev.target.value)}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  )
  const view = (
    <SpaceView
      state={state}
      mode={mode}
      paused={paused}
      highlight={highlight || null}
      quality={(query.get('quality') as QualityChoice | null) ?? undefined}
      className="preview-big"
    />
  )
  if (query.has('bare')) return <>{view}<style>{'.preview-big { height: 100vh; border-radius: 0; }'}</style></>
  return (
    <div style={{ padding: 12, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <button type="button" onClick={() => setMode(mode === 'orbit' ? 'spacecraft' : 'orbit')}>Mode: {mode}</button>
        {select('orbit', of('orbit'))}
        {select('bus', of('bus'))}
        {select('solar', of('power_system', (x) => x.props.type !== 'battery'))}
        {select('comms', of('comms_system'))}
        {of('instrument').map((i) => (
          <label key={i.id}>
            <input
              type="checkbox"
              checked={picked.includes(i.id)}
              onChange={() => set('instruments', (picked.includes(i.id) ? picked.filter((x) => x !== i.id) : [...picked, i.id]).join(','))}
            />
            {i.name}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <button type="button" onClick={() => setT(t === undefined ? 0 : undefined)}>{t === undefined ? 'Launch' : 'Back to design'}</button>
        <label>
          speed{' '}
          <select value={speed} onChange={(ev) => setSpeed(Number(ev.target.value))}>
            {[[0, 'still'], [60, '1 min/s'], [600, '10 min/s'], [86_400, '1 day/s'], [5_184_000, '60 days/s']].map(([v, name]) => <option key={v} value={v}>{name}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setPaused(!paused)}>{paused ? 'Resume' : 'Pause'}</button>
        <label>
          highlight{' '}
          <select value={highlight} onChange={(ev) => setHighlight(ev.target.value)}>
            {[...new Set([...FAMILIES, highlight])].map((f) => <option key={f} value={f}>{f || 'none'}</option>)}
          </select>
        </label>
        <span>
          phase {String(state.metrics.phase)} · t {Math.round(state.t_s)} s · day {Number(state.metrics.mission_day ?? 0).toFixed(2)} · {String(state.metrics.outcome)}
        </span>
      </div>
      {note && <div style={{ color: '#ffc0b0' }}>{note}</div>}
      {view}
      {stats && <pre id="stats" style={{ margin: 0 }}>{stats}</pre>}
      <style>{'.preview-big { height: min(72vh, 640px); }'}</style>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
