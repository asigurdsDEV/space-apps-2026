// CAPCOM answers every design choice in the first-person hall, like a real flight loop:
// "Copy, Flight. X-band transmitter fitted · downlink ×64 · +$0.8M". Pure: two SimStates in, one line out.
// Words budget (decision 007): at most 90 characters, at most two numbers.

import type { SimState } from '../../shared'
import { shortOf } from '../mission/walls'

export const CALLOUT_MAX = 90

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

function money(usd: number): string {
  const a = Math.abs(usd)
  const s = a >= 1e9 ? `$${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `$${Math.round(a / 1e3)}K` : `$${Math.round(a)}`
  return (usd < 0 ? '−' : '+') + s.replace('.0', '')
}

function ratio(before: number, after: number): string | null {
  if (!(before > 0) || !(after > 0)) return null
  const r = after / before
  if (r >= 1.5) return `×${r >= 10 ? Math.round(r) : r.toFixed(1).replace('.0', '')}`
  if (r <= 1 / 1.5) return `÷${1 / r >= 10 ? Math.round(1 / r) : (1 / r).toFixed(1).replace('.0', '')}`
  return null
}

const partName = (state: SimState, id: string) => state.entities.find((e) => e.id === id)?.name ?? id

/** What the player changed, in words: "X-band transmitter fitted", "Magnetometer added", "3 ground stations". */
function changeOf(before: SimState, after: SimState): string | null {
  for (const key of Object.keys(after.params)) {
    const a = after.params[key]
    const b = before.params[key]
    if (a === b) continue
    if (key === 'instruments') {
      const was = String(b ?? '').split(',').filter(Boolean)
      const now = String(a ?? '').split(',').filter(Boolean)
      const added = now.find((id) => !was.includes(id))
      const removed = was.find((id) => !now.includes(id))
      if (added) return `${partName(after, added)} added`
      if (removed) return `${partName(after, removed)} removed`
      continue
    }
    if (key === 'ground_stations') return `${a} ground station${a === 1 ? '' : 's'}`
    if (typeof a === 'string' && a) return `${partName(after, a)} fitted`
  }
  return null
}

/**
 * CAPCOM's one-line reply to a design change, or null when nothing the player chose changed.
 * New NO-GO problems come first ("Heads up, Flight: Too heavy for the rocket"), then cleared ones,
 * then the change with its two biggest effects (downlink, science, mass, money).
 */
export function fitCallout(before: SimState, after: SimState): string | null {
  const change = changeOf(before, after)
  if (!change) return null
  const errs = (s: SimState) => s.issues.filter((i) => i.severity === 'error')
  const newError = errs(after).find((i) => !errs(before).some((j) => j.code === i.code))
  if (newError) return clip(`${change}. Heads up, Flight: ${shortOf(newError, 50)}`)
  const cleared = errs(before).find((i) => !errs(after).some((j) => j.code === i.code))
  if (cleared) return clip(`Copy, Flight. ${change}. That clears it: ${shortOf(cleared, 40)}`)

  const m0 = before.metrics
  const m1 = after.metrics
  const effects: string[] = []
  const down = ratio(num(m0.downlink_gb_per_day), num(m1.downlink_gb_per_day))
  if (down) effects.push(`downlink ${down}`)
  const sci = ratio(num(m0.science_per_day), num(m1.science_per_day))
  if (sci) effects.push(`science ${sci}`)
  const dm = num(m1.mass_kg) - num(m0.mass_kg)
  if (Math.abs(dm) >= 0.5) effects.push(`${dm > 0 ? '+' : '−'}${Math.abs(dm) >= 10 ? Math.round(Math.abs(dm)) : Math.abs(dm).toFixed(1)} kg`)
  const dc = num(m1.cost_usd) - num(m0.cost_usd)
  if (Math.abs(dc) >= 1000) effects.push(money(dc))
  return clip(['Copy, Flight. ' + change, ...effects.slice(0, 2)].join(' · '))
}

function clip(line: string): string {
  return line.length <= CALLOUT_MAX ? line : `${line.slice(0, CALLOUT_MAX - 1).trimEnd()}…`
}
