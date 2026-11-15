// The words and numbers the Live Earth panel shows. Pure, so the wording rules in README.md are tested.
import type { Screening } from './screening'
import type { KpNow } from './spaceWeather'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const two = (n: number) => String(n).padStart(2, '0')

/** "14 Nov", in UTC like every time on this screen. */
export function dayText(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}
/** "06:00 UTC". */
export function timeText(iso: string | number): string {
  const d = new Date(iso)
  return `${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC`
}
export const whenText = (iso: string): string => `${dayText(iso)}, ${timeText(iso)}`

/** "35.8° N, 149.8° W". */
export function placeText(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(1)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon).toFixed(1)}° ${lon < 0 ? 'W' : 'E'}`
}

export const count = (n: number): string => Math.round(n).toLocaleString('en-US')

/** CelesTrak's "COSMOS 2251 DEB" as "Cosmos 2251 debris". */
export function debrisName(name: string): string {
  return name.trim().split(/\s+/).map((word) => (word === 'DEB' ? 'debris' : /^[A-Z]+$/.test(word) ? word[0] + word.slice(1).toLowerCase() : word)).join(' ')
}

/** The close-approach chip at `nowMs`: a headline, when, and one sentence. Distances to the kilometre; no distance when nothing shares the height. */
export function approachText(s: Screening, nowMs: number): { headline: string; when: string; detail: string } {
  if (s.sharingAltitude === 0) return { headline: 'None at this height', when: '', detail: 'No tracked piece from these four debris clouds reaches this height.' }
  const pieces = `${count(s.sharingAltitude)} tracked ${s.sharingAltitude === 1 ? 'piece crosses' : 'pieces cross'} this height.`
  if (!s.closest) return { headline: 'No pass found', when: '', detail: pieces }
  const old = s.closest.elementsAgeDays >= 2 ? ` (its orbit data is ${Math.round(s.closest.elementsAgeDays)} days old)` : ''
  return { headline: `${count(s.closest.distanceKm)} km`, when: `in ${Math.max(0, Math.round((Date.parse(s.closest.at) - nowMs) / 60_000))} min`, detail: `${debrisName(s.closest.name)}${old}. ${pieces}` }
}

/** "0.67 · quiet" or "7.33 · G3 strong storm". */
export function kpText(kp: KpNow): string {
  return `${kp.kp.toFixed(2).replace(/\.?0+$/, '')} · ${kp.g ? `G${kp.g} ` : ''}${kp.label}`
}
