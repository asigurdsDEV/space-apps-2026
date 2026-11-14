// Copy a link to the current design, save designs in this browser, and compare two of them.
import { useState } from 'react'
import type { Command, SimState } from '../../shared'
import { formatMetric } from '../mission/format'
import { DESIGN_KEYS, deleteDesign, encodeDesign, listDesigns, loadCommands, saveDesign, type DesignKey } from './share'
import './share.css'

export interface SharePanelProps {
  state: SimState
  send: (command: Command) => void
}

const CHOICE_LABEL: Record<DesignKey, string> = {
  launch_vehicle: 'Launch vehicle',
  orbit: 'Orbit',
  bus: 'Spacecraft bus',
  solar: 'Solar array',
  battery: 'Battery',
  comms: 'Radio',
  instruments: 'Instruments',
}

const NUMBERS = [
  ['mass_kg', 'Mass'],
  ['cost_usd', 'Cost'],
  ['power_w', 'Power draw'],
  ['science_per_day', 'Science per day'],
] as const

export function SharePanel({ state, send }: SharePanelProps) {
  const [saved, setSaved] = useState(listDesigns)
  const [name, setName] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)
  const [link, setLink] = useState<{ hash: string; url: string; copied: boolean } | null>(null)
  const [pickA, setPickA] = useState('')
  const [pickB, setPickB] = useState('')

  const hash = encodeDesign(state.params)
  const a = saved.find((d) => d.name === pickA) ?? saved[0]
  const b = saved.find((d) => d.name === pickB) ?? saved[1]
  const partNames = new Map(state.entities.map((e) => [e.id, e.name]))
  const choice = (ids = '') =>
    ids.split(',').filter(Boolean).map((id) => partNames.get(id) ?? id).join(', ') || 'None'

  function copyLink() {
    location.hash = hash
    const url = location.href
    const show = (copied: boolean) => setLink({ hash, url, copied })
    // No clipboard on http pages or in old browsers: show the link to copy by hand.
    if (!navigator.clipboard) return show(false)
    navigator.clipboard.writeText(url).then(() => show(true), () => show(false))
  }

  return (
    <section className="sh" aria-label="Save and share">
      <div className="sh-row">
        <button type="button" onClick={copyLink}>Copy link</button>
        <span role="status">
          {/* only while the link still matches the design on screen */}
          {link?.hash === hash &&
            (link.copied ? (
              'Copied'
            ) : (
              <label>
                Copy this link:{' '}
                <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} />
              </label>
            ))}
        </span>
      </div>

      <form
        className="sh-row"
        onSubmit={(e) => {
          e.preventDefault()
          const next = saveDesign(name, state)
          setSaved(next)
          setSaveFailed(!next.some((d) => d.name === name.trim()))
        }}
      >
        <label htmlFor="sh-name">Design name</label>
        <input id="sh-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        <button type="submit" disabled={name.trim() === ''}>Save design</button>
        {saveFailed && <span role="alert">Could not save: browser storage is full or turned off.</span>}
      </form>

      {saved.length === 0 ? (
        <p className="sh-muted">No saved designs yet.</p>
      ) : (
        <ul className="sh-list">
          {saved.map((d) => (
            <li key={d.name} className="sh-row">
              <span className="sh-name">{d.name}</span>
              <button type="button" aria-label={`Load ${d.name}`} onClick={() => loadCommands(d.design).forEach(send)}>
                Load
              </button>
              <button type="button" aria-label={`Delete ${d.name}`} onClick={() => setSaved(deleteDesign(d.name))}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {a && b && (
        <>
          <div className="sh-row">
            <label>
              Compare{' '}
              <select value={a.name} onChange={(e) => setPickA(e.target.value)}>
                {saved.map((d) => <option key={d.name}>{d.name}</option>)}
              </select>
            </label>
            <label>
              with{' '}
              <select value={b.name} onChange={(e) => setPickB(e.target.value)}>
                {saved.map((d) => <option key={d.name}>{d.name}</option>)}
              </select>
            </label>
          </div>
          <table className="sh-table">
            <thead>
              <tr>
                <td />
                <th scope="col">{a.name}</th>
                <th scope="col">{b.name}</th>
              </tr>
            </thead>
            <tbody>
              {DESIGN_KEYS.map((key) => (
                <tr key={key}>
                  <th scope="row">{CHOICE_LABEL[key]}</th>
                  <td>{choice(a.design[key])}</td>
                  <td>{choice(b.design[key])}</td>
                </tr>
              ))}
              {NUMBERS.map(([key, label]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{formatMetric(key, a[key])}</td>
                  <td>{formatMetric(key, b[key])}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">Ready to launch</th>
                <td>{a.has_error ? 'No, has errors' : 'Yes'}</td>
                <td>{b.has_error ? 'No, has errors' : 'Yes'}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
