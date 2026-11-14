// Copy a link to the current design, save designs in this browser, and compare two of them.
import { useState, type FormEvent } from 'react'
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

const FAILED = 'Could not change saved designs: browser storage is full or turned off.'

export function SharePanel({ state, send }: SharePanelProps) {
  const [saved, setSaved] = useState(listDesigns)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')
  const [confirming, setConfirming] = useState('')
  const [link, setLink] = useState<{ hash: string; url: string; copied: boolean } | null>(null)
  const [pickA, setPickA] = useState('')
  const [pickB, setPickB] = useState('')

  const hash = encodeDesign(state.params)
  const a = saved.find((d) => d.name === pickA) ?? saved[0]
  const b = saved.find((d) => d.name === pickB) ?? saved[1]
  const partNames = new Map(state.entities.map((e) => [e.id, e.name]))
  const choice = (ids = '') =>
    ids.split(',').filter(Boolean).map((id) => partNames.get(id) ?? id).join(', ') || 'None'

  function save(e: FormEvent) {
    e.preventDefault()
    const result = saveDesign(name, state)
    if (!result) return setStatus(FAILED)
    setSaved(result.designs)
    setStatus(`${result.replaced ? 'Replaced' : 'Saved'} "${name.trim()}".`)
    setName('')
  }

  // Deleting cannot be undone, so it takes two clicks on the same button.
  function remove(target: string) {
    if (confirming !== target) return setConfirming(target)
    setConfirming('')
    const next = deleteDesign(target)
    if (!next) return setStatus(FAILED)
    setSaved(next)
    setStatus(`Deleted "${target}".`)
    // The row and its button are gone: keep keyboard focus in the panel.
    document.getElementById('sh-name')?.focus()
  }

  function copyLink() {
    // replaceState, not location.hash: no hashchange event, so an app listening for pasted links is not re-triggered.
    history.replaceState(null, '', `#${hash}`)
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

      <form className="sh-row" onSubmit={save}>
        <label htmlFor="sh-name">Design name</label>
        <input id="sh-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        <button type="submit" disabled={name.trim() === ''}>
          {saved.some((d) => d.name === name.trim()) ? 'Replace design' : 'Save design'}
        </button>
        <span role="status">{status}</span>
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
              <button
                type="button"
                aria-label={confirming === d.name ? `Really delete ${d.name}?` : `Delete ${d.name}`}
                onClick={() => remove(d.name)}
                onBlur={() => setConfirming('')}
              >
                {confirming === d.name ? 'Really delete?' : 'Delete'}
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
                {saved.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </label>
            <label>
              with{' '}
              <select value={b.name} onChange={(e) => setPickB(e.target.value)}>
                {saved.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
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
