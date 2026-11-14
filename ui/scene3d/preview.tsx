// Dev-only preview: `npm run dev`, then open /ui/scene3d/preview.html. Not part of the build.
// shortcut: a hand-copied subset of data/ catalog rows (PR #8); the real screens pass state.entities.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Entity, Params } from '../../shared'
import { SpaceView } from './SpaceView'
import type { ViewMode } from './world'

const e = (kind: string, id: string, name: string, props: Params): Entity => ({ id, kind, name, props })
const entities: Entity[] = [
  e('orbit', 'leo-iss', 'Low Earth orbit (ISS-like)', { central_body: 'earth', altitude_m: 400_000, inclination_rad: 0.9006, period_s: 5550 }),
  e('orbit', 'sso', 'Sun-synchronous orbit', { central_body: 'earth', altitude_m: 600_000, inclination_rad: 1.7064, period_s: 5800 }),
  e('orbit', 'geo', 'Geostationary orbit', { central_body: 'earth', altitude_m: 35_786_000, inclination_rad: 0, period_s: 86164 }),
  e('orbit', 'lunar', 'Low lunar orbit', { central_body: 'moon', altitude_m: 100_000, inclination_rad: 1.5708, period_s: 7080, cruise_days: 5 }),
  e('orbit', 'low-mars-orbit', 'Low Mars orbit', { central_body: 'mars', altitude_m: 300_000, inclination_rad: 1.62, period_s: 6800, cruise_days: 210 }),
  e('bus', 'cubesat-3u', '3U CubeSat', { class: 'cubesat', dry_mass_kg: 3 }),
  e('bus', 'cubesat-6u', '6U CubeSat', { class: 'cubesat', dry_mass_kg: 7 }),
  e('bus', 'cubesat-12u', '12U CubeSat', { class: 'cubesat', dry_mass_kg: 14 }),
  e('bus', 'smallsat', 'Small satellite (ESPA-class)', { class: 'smallsat', dry_mass_kg: 120 }),
  e('bus', 'medium-bus', 'Medium spacecraft', { class: 'medium', dry_mass_kg: 800 }),
  e('bus', 'flagship-bus', 'Flagship spacecraft', { class: 'flagship', dry_mass_kg: 3000 }),
  e('power_system', 'solar-body-panels', 'Body-mounted solar cells', { type: 'solar', power_w: 7 }),
  e('power_system', 'solar-deployable-small', 'Small deployable solar wings', { type: 'solar', power_w: 30 }),
  e('power_system', 'solar-deployable-large', 'Large deployable solar wings', { type: 'solar', power_w: 80 }),
  e('power_system', 'solar-array-medium', 'Medium solar array', { type: 'solar', power_w: 1000 }),
  e('power_system', 'solar-array-large', 'Large solar array', { type: 'solar', power_w: 6000 }),
  e('power_system', 'rtg', 'Radioisotope power system (MMRTG)', { type: 'rtg', power_w: 110 }),
  e('comms_system', 'uhf-radio', 'UHF radio', { band: 'UHF' }),
  e('comms_system', 's-band-patch', 'S-band patch antenna', { band: 'S' }),
  e('comms_system', 'x-band-transmitter', 'X-band transmitter', { band: 'X' }),
  e('comms_system', 'high-gain-dish', 'High-gain dish antenna', { band: 'Ka' }),
  e('instrument', 'camera-basic', 'Basic Earth camera', { category: 'imager' }),
  e('instrument', 'magnetometer', 'Magnetometer', { category: 'fields' }),
  e('instrument', 'ir-spectrometer', 'Infrared spectrometer', { category: 'spectrometer' }),
  e('instrument', 'uv-telescope', 'Ultraviolet space telescope', { category: 'telescope' }),
  e('instrument', 'synthetic-aperture-radar', 'Synthetic aperture radar', { category: 'radar' }),
]

const pick = (kind: string, where?: (x: Entity) => boolean) => entities.filter((x) => x.kind === kind && (!where || where(x)))

function Preview() {
  const [mode, setMode] = useState<ViewMode>('spacecraft')
  const [params, setParams] = useState<Params>({
    orbit: 'sso', bus: 'cubesat-6u', solar: 'solar-deployable-small', comms: 's-band-patch', instruments: 'camera-basic',
  })
  const set = (key: string, value: string) => setParams((p) => ({ ...p, [key]: value }))
  const picked = String(params.instruments ?? '').split(',').filter(Boolean)
  const select = (key: string, options: Entity[]) => (
    <label>
      {key}{' '}
      <select value={String(params[key] ?? '')} onChange={(ev) => set(key, ev.target.value)}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  )
  return (
    <div style={{ padding: 12, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <label>
          mode{' '}
          <select value={mode} onChange={(ev) => setMode(ev.target.value as ViewMode)}>
            {(['spacecraft', 'orbit', 'cruise'] as const).map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        {select('orbit', pick('orbit'))}
        {select('bus', pick('bus'))}
        {select('solar', pick('power_system'))}
        {select('comms', pick('comms_system'))}
        {pick('instrument').map((i) => (
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
      <SpaceView state={{ entities, params }} mode={mode} className="preview-big" />
      <style>{'.preview-big { height: min(72vh, 640px); }'}</style>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
