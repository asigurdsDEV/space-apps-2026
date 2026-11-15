// What every screen in the mission control hall shows: the video wall, the side walls, the desk monitors.
// All of it is the design being built, read from the sim's state; nothing here is filler. Canvas 2D only:
// control.ts owns the canvases and calls these when the numbers behind a screen change.

import { columnLabel, formatValue, unitOf, type Bar } from '../builder/model'
import { brief, type ConsoleCall } from '../gonogo'
import { BODY_NAMES, type Body } from '../scene3d/model'
import earthDay from '../scene3d/maps/earth-day.jpg?inline'
import mars from '../scene3d/maps/mars.jpg?inline'
import moon from '../scene3d/maps/moon.jpg?inline'
import type { Metrics } from '../../shared'
import { shortLabel, STATION_NAMES, type Debrief, type Station } from './layout'
import { BODY_DAY_S, flightPlan, groundTrack, trackLines, trackRevs, westShift } from './wall'

type G = CanvasRenderingContext2D

/** The real surface map of each body (ui/scene3d/maps), for the ground-track screen. */
export const MAP_URL: Record<Body, string> = { earth: earthDay, moon, mars }

const INK = '#07090c'
export const TEXT = '#f5f6f8'
const MUTED = '#a0a3a8'
const LINE = 'rgba(245,246,248,0.16)'
const ACCENT = '#ffffff'
export const GOOD = '#f5f6f8'
const WARN = '#a0a3a8'
const BAD = '#ff7a7a'

/** The start menu's face (ui/start/start.css); the system sans until it has loaded, or offline. */
export const face = (px: number, weight = 400) => `${weight} ${Math.round(px)}px "Inter Tight", system-ui, sans-serif`

/** Words that fit `max` px wide, on at most `lines` lines. */
export function wrap(g: G, words: string, max: number, lines: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of words.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (g.measureText(next).width > max && line) {
      out.push(line)
      line = word
      if (out.length === lines) break
    } else line = next
  }
  if (out.length < lines && line) out.push(line)
  return out
}

function text(g: G, words: string, x: number, y: number, px: number, colour = TEXT, align: CanvasTextAlign = 'left', max?: number, weight = 400) {
  g.font = face(px, weight)
  g.letterSpacing = '0px'
  g.fillStyle = colour
  g.textAlign = align
  g.fillText(words, x, y, max)
}

/** A small spaced-out capital label. */
function caps(g: G, words: string, x: number, y: number, px: number, colour = MUTED, align: CanvasTextAlign = 'left', max?: number) {
  g.font = face(px, 500)
  g.letterSpacing = `${(px * 0.16).toFixed(1)}px`
  g.fillStyle = colour
  g.textAlign = align
  g.fillText(words.toUpperCase(), x, y, max)
}

function backdrop(g: G, w: number, h: number) {
  const fill = g.createLinearGradient(0, 0, 0, h)
  fill.addColorStop(0, '#101216')
  fill.addColorStop(1, INK)
  g.fillStyle = fill
  g.fillRect(0, 0, w, h)
  g.textBaseline = 'middle'
}

const rule = (g: G, x: number, y: number, w: number) => {
  g.fillStyle = LINE
  g.fillRect(x, y, w, 2)
}

/** The top of a wall screen: its name, a note on the right, a hairline. `k` scales it for smaller canvases. */
function header(g: G, w: number, title: string, note = '', k = 1) {
  const pad = 64 * k
  g.fillStyle = ACCENT
  g.fillRect(pad, 40 * k, 12 * k, 12 * k)
  caps(g, title, pad + 30 * k, 47 * k, 30 * k, ACCENT)
  if (note) caps(g, note, w - pad, 47 * k, 26 * k, MUTED, 'right')
  rule(g, pad, 84 * k, w - pad * 2)
}

const callColour = (c: ConsoleCall) => (c.call === 'go' ? GOOD : c.call === 'no-go' ? BAD : WARN)
const callWord = (c: ConsoleCall) => (c.call === 'go' ? 'GO' : c.call === 'no-go' ? 'NO-GO' : 'GO?')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const pct = (v: unknown) => `${Math.round(num(v) * 100)}%`
const spanText = (days: number) => (days >= 700 ? `${(days / 365).toFixed(1).replace('.0', '')} years` : days >= 60 ? `${Math.round(days / 30.44)} months` : `${Math.round(days)} days`)

/** A thin bar: how much of a limit is used, or how much of a goal is met. Over the limit, the limit mark moves left and the bar runs past it. */
function meter(g: G, b: Bar, x: number, y: number, w: number, h: number) {
  const scale = Math.max(1, Number.isFinite(b.ratio) ? b.ratio : 1)
  g.fillStyle = 'rgba(245,246,248,0.12)'
  g.fillRect(x, y, w, h)
  g.fillStyle = b.bad ? BAD : GOOD
  g.fillRect(x, y, w * Math.max(0, Math.min(1, (Number.isFinite(b.ratio) ? b.ratio : 1) / scale)), h)
  if (scale > 1) {
    g.fillStyle = TEXT
    g.fillRect(x + w / scale - 1.5, y - h * 0.6, 3, h * 2.2)
  }
}

const barValue = (b: Bar) => `${formatValue(b.used, b.unit)} / ${formatValue(b.limit, b.unit)}`
const barFlag = (b: Bar) => (!b.bad ? '' : b.goal ? 'SHORT' : 'OVER')

// ---------------------------------------------------------------- The video wall (1536 x 768 each)

export interface MissionScreen {
  title: string
  objective?: string
  /** Big numbers: [label, value]. */
  numbers: [string, string][]
  calls: ConsoleCall[]
  /** The launch day, YYYY-MM-DD. */
  launch?: string
  debrief?: Pick<Debrief, 'grade' | 'score' | 'outcome'> & { fix?: string }
}

/** The mission call: its name, what it asks for, the three numbers that bound it, and the poll at a glance. After the flight: the grade. */
export function drawMission(g: G, s: MissionScreen) {
  const W = 1536
  const P = 64
  backdrop(g, W, 768)
  if (s.debrief) {
    const r = s.debrief
    header(g, W, 'Debrief', s.title)
    text(g, r.grade, W / 2, 330, 330, r.grade === 'F' ? BAD : r.grade === 'A' || r.grade === 'B' ? GOOD : WARN, 'center', undefined, 500)
    text(g, `${r.outcome} · ${Math.round(r.score)} points`, W / 2, 560, 60, TEXT, 'center', W - P * 2)
    if (r.fix) text(g, `Try at the spacecraft: ${r.fix}`, W / 2, 660, 42, MUTED, 'center', W - P * 2)
    return
  }
  header(g, W, 'Mission call', s.launch ? `Launch ${s.launch}` : '')
  g.font = face(84, 500)
  g.letterSpacing = '0px'
  const title = wrap(g, s.title, W - P * 2, 2)
  title.forEach((line, i) => text(g, line, P, 162 + i * 94, 84, TEXT, 'left', W - P * 2, 500))
  if (s.objective) {
    g.font = face(35)
    wrap(g, s.objective, W - P * 2, 3).forEach((line, i) => text(g, line, P, 162 + title.length * 94 - 8 + i * 46, 35, MUTED))
  }
  const col = (W - P * 2) / Math.max(s.numbers.length, 1)
  s.numbers.forEach(([label, value], i) => {
    text(g, value, P + i * col, 548, 108, TEXT, 'left', col - 40, 500)
    caps(g, label, P + i * col, 628, 28)
  })
  rule(g, P, 672, W - P * 2)
  const cell = (W - P * 2) / Math.max(s.calls.length, 1)
  s.calls.forEach((c, i) => {
    const x = P + i * cell
    g.fillStyle = callColour(c)
    g.beginPath()
    g.arc(x + 10, 720, 10, 0, Math.PI * 2)
    g.fill()
    text(g, callWord(c), x + cell - 30, 721, 32, callColour(c), 'right', undefined, 500)
    caps(g, c.label, x + 34, 721, 23, MUTED, 'left', cell - 76 - g.measureText(callWord(c)).width)
  })
}

export interface TrackScreen {
  body: Body
  altitude_m: number
  inclination_rad: number
  period_s: number
  /** The chosen orbit's name, and how the sim rates it: fraction of each lap in shadow, contact seconds a day. */
  name?: string
  eclipse?: number
  contact_s?: number
}

/** Where on the map a ground track starts: an arbitrary but fixed crossing of the equator, well clear of the map's edge. */
const TRACK_LON0 = -38

function drawTrackOn(g: G, s: TrackScreen, map: CanvasImageSource | undefined, x: number, y: number, w: number, h: number, weight: number) {
  if (map) g.drawImage(map, x, y, w, h)
  // Dimmed, so the track and the room's holograms stay the brightest things in view.
  g.fillStyle = map ? 'rgba(7,9,12,0.5)' : '#101216'
  g.fillRect(x, y, w, h)
  const px = (lon: number) => x + ((lon + 180) / 360) * w
  const py = (lat: number) => y + ((90 - lat) / 180) * h
  g.fillStyle = 'rgba(245,246,248,0.13)'
  for (let lon = -150; lon <= 150; lon += 30) g.fillRect(px(lon), y, 1, h)
  for (let lat = -60; lat <= 60; lat += 30) g.fillRect(x, py(lat), w, lat === 0 ? 2 : 1)
  const day = BODY_DAY_S[s.body]
  const revs = trackRevs(s.period_s, day)
  const steps = 96
  const points = groundTrack(s.inclination_rad, s.period_s, day, revs, steps, TRACK_LON0)
  // Where the body turns slowly the passes lie close together (the Moon): thinner lines keep them apart.
  weight = Math.min(weight, Math.max(1.2, (westShift(s.period_s, day) / 360) * w * 0.35))
  g.lineJoin = 'round'
  g.lineCap = 'round'
  // One pass at a time, the newest brightest, each with a dark edge so it reads over cloud, ice and desert alike.
  for (let rev = 0; rev < revs; rev++) {
    const alpha = 0.35 + 0.65 * ((rev + 1) / revs)
    for (const line of trackLines(points.slice(rev * steps, (rev + 1) * steps + 1))) {
      for (const [colour, width] of [[`rgba(7,9,12,${0.55 * alpha})`, weight * 2.4], [`rgba(245,246,248,${alpha})`, weight]] as const) {
        g.strokeStyle = colour
        g.lineWidth = width
        g.beginPath()
        line.forEach(([lon, lat], k) => (k ? g.lineTo(px(lon), py(lat)) : g.moveTo(px(lon), py(lat))))
        g.stroke()
      }
    }
  }
  const [lon, lat] = points[points.length - 1]!
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.arc(px(lon), py(lat), weight * 2.2, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.7)'
  g.lineWidth = weight * 0.6
  g.beginPath()
  g.arc(px(lon), py(lat), weight * 5.5, 0, Math.PI * 2)
  g.stroke()
}

/** The chosen orbit's path over the real map of the body it circles, with the orbit's own numbers underneath. */
export function drawTrack(g: G, s: TrackScreen, map?: CanvasImageSource) {
  const W = 1536
  const H = 768
  g.textBaseline = 'middle'
  drawTrackOn(g, s, map, 0, 0, W, H, 5)
  const top = g.createLinearGradient(0, 0, 0, 150)
  top.addColorStop(0, 'rgba(7,9,12,0.9)')
  top.addColorStop(1, 'rgba(7,9,12,0)')
  g.fillStyle = top
  g.fillRect(0, 0, W, 150)
  g.fillStyle = ACCENT
  g.fillRect(64, 40, 12, 12)
  caps(g, 'Ground track', 94, 47, 30, ACCENT)
  caps(g, `Over ${BODY_NAMES[s.body]}`, W - 64, 47, 26, TEXT, 'right')
  if (s.name) text(g, s.name, 64, 108, 58, TEXT, 'left', W - 128, 500)
  g.fillStyle = 'rgba(7,9,12,0.82)'
  g.fillRect(0, H - 128, W, 128)
  const turns = 360 / westShift(s.period_s, BODY_DAY_S[s.body])
  const facts: [string, string][] = [
    ['Altitude', formatValue(s.altitude_m, 'm')],
    ['Tilt', `${((s.inclination_rad * 180) / Math.PI).toFixed(1)}°`],
    ['One lap', formatValue(s.period_s, 's')],
    // A lap as long as the body's day never moves over the ground.
    [turns < 1.01 ? 'Over the ground' : `Laps a ${s.body === 'mars' ? 'sol' : s.body === 'moon' ? 'lunar day' : 'day'}`, turns < 1.01 ? 'Stays put' : turns.toFixed(turns < 100 ? 1 : 0)],
  ]
  if (typeof s.eclipse === 'number') facts.push(['In shadow', pct(s.eclipse)])
  if (typeof s.contact_s === 'number') facts.push(['Contact', formatValue(s.contact_s, 's/day')])
  const col = (W - 128) / facts.length
  facts.forEach(([label, value], i) => {
    caps(g, label, 64 + i * col, H - 92, 22, MUTED, 'left', col - 24)
    text(g, value, 64 + i * col, H - 44, 46, TEXT, 'left', col - 24, 500)
  })
}

/** The margins: every budget the sim checks, used against allowed. */
export function drawMargins(g: G, bars: Bar[]) {
  const W = 1536
  const P = 64
  backdrop(g, W, 768)
  const short = bars.filter((b) => b.bad).length
  header(g, W, 'Margins', short ? `${short} out of limits` : 'All inside limits')
  const rows = bars.slice(0, 8)
  const h = Math.min(100, 660 / Math.max(rows.length, 1))
  rows.forEach((b, i) => {
    const y = 100 + i * h
    text(g, b.label, P, y + h * 0.36, Math.min(40, h * 0.42), TEXT, 'left', 700)
    const flag = barFlag(b)
    if (flag) caps(g, flag, P + Math.min(700, g.measureText(b.label).width) + 28, y + h * 0.37, 26, BAD)
    text(g, barValue(b), W - P, y + h * 0.36, Math.min(36, h * 0.38), b.bad ? BAD : MUTED, 'right', 560)
    meter(g, b, P, y + h * 0.68, W - P * 2, Math.max(8, h * 0.13))
  })
}

// ---------------------------------------------------------------- The side walls (1280 x 640 each)

const partNames = (s: Station) => s.picked.map((id) => shortLabel(s.parts.find((p) => p.id === id)!))
const partCost = (s: Station) => s.picked.reduce((sum, id) => sum + num(s.parts.find((p) => p.id === id)?.props.cost_usd), 0)

/** The design so far: every slot with what is fitted in it and what that costs. */
export function drawDesign(g: G, stations: Station[], metrics: Metrics) {
  const W = 1280
  const P = 56
  backdrop(g, W, 640)
  const budget = num(metrics.budget_usd)
  header(g, W, 'Spacecraft design', `${formatValue(num(metrics.cost_usd), 'USD')}${budget ? ` of ${formatValue(budget, 'USD')}` : ''}`, 0.86)
  const h = Math.min(78, 550 / Math.max(stations.length, 1))
  stations.forEach((s, i) => {
    const y = 84 + i * h + h / 2
    if (i) rule(g, P, y - h / 2, W - P * 2)
    caps(g, s.name, P, y, 24)
    const names = partNames(s)
    text(g, names.length ? names.join('  +  ') : 'None fitted', 330, y, 40, names.length ? TEXT : WARN, 'left', 640, 500)
    const cost = partCost(s)
    if (cost) text(g, formatValue(cost, 'USD'), W - P, y, 34, MUTED, 'right')
  })
}

/** The flight plan: build, launch, cruise, science, with the sim's dates, lengths and odds. */
export function drawPlan(g: G, metrics: Metrics, launchUtc: string | undefined, rocket: string | undefined) {
  const W = 1280
  const P = 56
  backdrop(g, W, 640)
  const plan = flightPlan(metrics, launchUtc)
  header(g, W, 'Flight plan', plan.end ? `Ends ${plan.end}` : '', 0.86)
  // Each phase gets room for its label, then a share of the rest by how long it lasts.
  const total = plan.phases.reduce((sum, p) => sum + p.days, 0) || 1
  const least = 190
  const spare = W - P * 2 - least * plan.phases.length
  const colours: Record<string, string> = { Build: '#6c7078', Cruise: WARN, Science: ACCENT }
  let x = P
  plan.phases.forEach((p, i) => {
    const w = least + (spare * p.days) / total
    g.fillStyle = colours[p.label] ?? TEXT
    g.fillRect(x + 3, 214, w - 6, 16)
    caps(g, p.label, x + 3, 170, 28, colours[p.label])
    text(g, spanText(p.days), x + 3, 276, 54, TEXT, 'left', w - 12, 500)
    if (p.label === 'Build' && plan.deadline_months > 0) {
      const late = num(metrics.schedule_months) > plan.deadline_months
      text(g, late ? `Window closes at ${plan.deadline_months} months` : `${Math.round(plan.deadline_months - num(metrics.schedule_months))} months to spare`, x + 3, 330, 28, late ? BAD : MUTED, 'left', w - 12)
    }
    if (i === 0) {
      // Launch day: the line between building and flying.
      g.fillStyle = TEXT
      g.fillRect(x + w - 1.5, 150, 3, 200)
      caps(g, 'Launch', x + w + 16, 330, 24, TEXT)
      if (plan.launch) text(g, plan.launch, x + w + 16, 364, 28, MUTED)
    }
    x += w
  })
  rule(g, P, 404, W - P * 2)
  const made = num(metrics.data_generated_gb_per_day)
  const facts: [string, string, string?][] = [
    [rocket ?? 'Rocket', pct(metrics.launch_reliability), 'reaches orbit'],
    ['Spacecraft', pct(metrics.bus_reliability), 'lasts the mission'],
    ['Data home', made > 0 ? pct(Math.min(1, num(metrics.downlink_gb_per_day) / made)) : '—', `of ${formatValue(made, 'GB/day')}`],
  ]
  if (num(metrics.science_goal) > 0) facts.push(['Science forecast', `${Math.round(num(metrics.science_expected))}`, `of ${Math.round(num(metrics.science_goal))} points`])
  const col = (W - P * 2) / facts.length
  facts.forEach(([label, value, note], i) => {
    caps(g, label, P + i * col, 446, 24, MUTED, 'left', col - 20)
    text(g, value, P + i * col, 518, 88, TEXT, 'left', col - 20, 500)
    if (note) text(g, note, P + i * col, 592, 28, MUTED, 'left', col - 20)
  })
}

// ---------------------------------------------------------------- The desks

/** The four GO / NO-GO monitors share one canvas, two by two: 640 x 400 each. */
export const CALL_GRID = { cols: 2, rows: 2, w: 640, h: 400 }

/** A console's call: GO, GO with concerns, or NO-GO, and in a few words what is wrong and what to do. */
export function drawCalls(g: G, calls: ConsoleCall[]) {
  const { cols, w, h } = CALL_GRID
  g.textBaseline = 'middle'
  calls.slice(0, 4).forEach((c, i) => {
    const x = (i % cols) * w
    const y = Math.floor(i / cols) * h
    g.fillStyle = '#101216'
    g.fillRect(x, y, w, h)
    g.fillStyle = callColour(c)
    g.fillRect(x, y, w, 8)
    caps(g, c.label, x + w / 2, y + 56, 34, MUTED, 'center', w - 40)
    text(g, callWord(c), x + w / 2, y + 150, 112, callColour(c), 'center', w - 40, 500)
    // A few words you can read from across the hall: what is wrong, then what to do.
    const short = brief(c)
    if (!short) return text(g, 'All checks good.', x + w / 2, y + 262, 36, TEXT, 'center')
    g.font = face(40, 500)
    g.letterSpacing = '0px'
    const problem = wrap(g, short.problem, w - 50, 2)
    problem.forEach((line, j) => text(g, line, x + w / 2, y + 244 + j * 46, 40, callColour(c), 'center', w - 30, 500))
    g.font = face(31)
    const fixAt = y + 244 + problem.length * 46 + 8
    wrap(g, short.fix, w - 50, 2).forEach((line, j) => text(g, line, x + w / 2, fixAt + j * 38, 31, TEXT, 'center', w - 30))
    if (c.reasons.length > 1) caps(g, `+${c.reasons.length - 1} more`, x + w / 2, y + 378, 20, MUTED, 'center')
  })
}

/** The small desk monitors share one canvas: a 4 x 4 grid of 384 x 216 tiles, each a different readout of the design. */
export const TILE_GRID = { cols: 4, rows: 4, w: 384, h: 216 }

export interface DeskScreens {
  stations: Station[]
  bars: Bar[]
  metrics: Metrics
  numbers: [string, string][]
  track: TrackScreen
}

/** Every small monitor: one tile per slot of the design, then the budgets one by one, the orbit and the odds. */
export function drawTiles(g: G, s: DeskScreens, map?: CanvasImageSource) {
  const { cols, w, h } = TILE_GRID
  const m = s.metrics
  g.textBaseline = 'middle'
  let i = 0
  /** The next tile: a dark panel with its name on top. */
  const tile = (title: string, body: (x: number, y: number) => void) => {
    const x = (i % cols) * w
    const y = Math.floor(i / cols) * h
    i++
    g.save()
    g.beginPath()
    g.rect(x, y, w, h)
    g.clip()
    g.fillStyle = '#101216'
    g.fillRect(x, y, w, h)
    g.fillStyle = ACCENT
    g.fillRect(x + 18, y + 20, 7, 7)
    caps(g, title, x + 34, y + 24, 15, ACCENT, 'left', w - 52)
    body(x, y)
    g.restore()
  }
  const meters = (title: string, pick: (b: Bar) => boolean) =>
    tile(title, (x, y) => {
      const rows = s.bars.filter(pick).slice(0, 2)
      if (!rows.length) text(g, 'No limit set', x + 18, y + 110, 26, MUTED)
      rows.forEach((b, k) => {
        const top = y + (rows.length === 1 ? 74 : 52 + k * 78)
        text(g, b.label, x + 18, top, 21, TEXT, 'left', w - 36)
        text(g, barValue(b), x + 18, top + 28, 19, b.bad ? BAD : MUTED, 'left', w - 110)
        if (b.bad) caps(g, barFlag(b), x + w - 18, top + 28, 15, BAD, 'right')
        meter(g, b, x + 18, top + 48, w - 36, 7)
      })
    })
  const figure = (title: string, value: string, note: string, colour = TEXT) =>
    tile(title, (x, y) => {
      text(g, value, x + 18, y + 108, 68, colour, 'left', w - 36, 500)
      text(g, note, x + 18, y + 174, 20, MUTED, 'left', w - 36)
    })

  for (const st of s.stations.slice(0, 7)) {
    tile(STATION_NAMES[st.key] ?? st.name, (x, y) => {
      const parts = st.picked.map((id) => st.parts.find((p) => p.id === id)!)
      const names = parts.map(shortLabel)
      g.font = face(30, 500)
      g.letterSpacing = '0px'
      const lines = wrap(g, names.length ? names.join(' + ') : 'None fitted', w - 36, 2)
      lines.forEach((line, k) => text(g, line, x + 18, y + 66 + k * 34, 30, names.length ? TEXT : WARN, 'left', w - 36, 500))
      // The first two numbers the builder lists for this slot, from the fitted part.
      const stats = st.slot.columns.filter((c) => c !== 'cost_usd' && typeof parts[0]?.props[c] === 'number').slice(0, 2)
      stats.forEach((c, k) => {
        const row = y + 146 + k * 32
        const label = columnLabel(c)
        text(g, label.charAt(0).toUpperCase() + label.slice(1), x + 18, row, 21, MUTED, 'left', 210)
        text(g, formatValue(parts[0]!.props[c] as number, unitOf(c)), x + w - 18, row, 23, TEXT, 'right', 140)
      })
    })
  }
  tile('Mission', (x, y) => s.numbers.slice(0, 3).forEach(([label, value], k) => {
    text(g, label, x + 18, y + 72 + k * 46, 20, MUTED)
    text(g, value, x + w - 18, y + 72 + k * 46, 30, TEXT, 'right', 200, 500)
  }))
  meters('Mass', (b) => b.resource === 'mass')
  meters('Power', (b) => b.resource === 'power')
  meters('Data', (b) => b.resource === 'data')
  meters('Budget', (b) => b.resource === 'budget')
  meters('Schedule', (b) => b.resource === 'time')
  const goal = num(m.science_goal)
  figure('Science forecast', `${Math.round(num(m.science_expected))}${goal ? ` / ${Math.round(goal)}` : ''}`, 'points by the end of the mission', goal && num(m.science_expected) < goal ? WARN : TEXT)
  tile(`Track over ${BODY_NAMES[s.track.body]}`, (x, y) => drawTrackOn(g, s.track, map, x + (w - 320) / 2, y + 46, 320, 160, 2.2))
  figure('Odds', pct(num(m.launch_reliability) * num(m.bus_reliability)), 'launch and spacecraft both hold')
}
