// The search box under "Where you are": typed coordinates are read here and never leave the page;
// anything else is an address, looked up once per press with OpenStreetMap Nominatim (one request, as its usage policy asks).
import { failureReason, get } from './feed'

export interface Place { lat: number; lon: number; name: string }

/** "40.7, -74.0", "40.7 -74", "40.7°N 74.0°W". Null when the text is not two numbers in range. */
export function parseCoords(text: string): { lat: number; lon: number } | null {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?$/i)
  if (!m) return null
  const lat = Number(m[1]) * (m[2]?.toUpperCase() === 'S' ? -1 : 1)
  const lon = Number(m[3]) * (m[4]?.toUpperCase() === 'W' ? -1 : 1)
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null
}

/** A place, or the sentence that says why there is none. */
export async function findPlace(text: string): Promise<Place | string> {
  const coords = parseCoords(text)
  if (coords) return { ...coords, name: text.trim() }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(text.trim())}`
    const [hit] = (await (await get(url, 'OpenStreetMap')).json()) as { lat: string; lon: string; display_name: string }[]
    if (!hit) return 'No place found with that name.'
    return { lat: Number(hit.lat), lon: Number(hit.lon), name: hit.display_name.split(',').slice(0, 2).join(',') }
  } catch (error) {
    return failureReason(error, 'OpenStreetMap')
  }
}
