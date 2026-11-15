// What mission control's displays show in the arrival cutscene: the first mission's real design
// (data/ catalogs run through sim/), drawn on 2D canvases. No three.js here; room.ts hangs them up.
import { getDatasets, PROGRAM, scenarios } from '../../data'
import { catalogEntities, evaluateDesign, findPart, formatUsd, instrumentIds, SLOTS } from '../../sim'
import type { Entity } from '../../shared'
import { brief, poll } from '../gonogo/model'
import { STATION_NAMES, shortLabel } from '../hangar/layout'
import earthUrl from '../scene3d/maps/earth-day.jpg?inline'
import marsUrl from '../scene3d/maps/mars.jpg?inline'
import moonUrl from '../scene3d/maps/moon.jpg?inline'

const DEG = 180 / Math.PI

/**
 * Where a circular orbit is over the ground `t` seconds after it crosses the equator northbound at `lon0`. Degrees.
 * A sun-synchronous plane keeps its angle to the Sun, so the ground turns under it once per solar day (86 400 s),
 * not once per sidereal day.
 */
export function subPoint(t: number, inclination_rad: number, period_s: number, lon0 = 0, out = { lat: 0, lon: 0 }) {
  const u = (2 * Math.PI * t) / period_s
  out.lat = Math.asin(Math.sin(inclination_rad) * Math.sin(u)) * DEG
  const lon = lon0 + (Math.atan2(Math.cos(inclination_rad) * Math.sin(u), Math.cos(u)) - (2 * Math.PI * t) / 86400) * DEG
  out.lon = ((((lon + 180) % 360) + 360) % 360) - 180
  return out
}

const num = (part: Entity | undefined, key: string) => Number(part?.props[key] ?? 0)
const rate = (bps: number) => (bps >= 1e6 ? `${bps / 1e6} Mbps` : `${bps / 1e3} kbps`)
const [headOf, tailOf] = [(title: string) => title.split(':')[0]!.trim(), (title: string) => (title.split(':')[1] ?? '').trim()]

/** Everything the screens print, read once from the first mission in the program as the player first meets it. */
export function missionFacts() {
  const entities = catalogEntities(getDatasets())
  const mission = scenarios.find((s) => s.scenario_id === PROGRAM[0])!
  const { params } = mission
  const report = evaluateDesign(params, entities)
  const slot = (key: string) => findPart(entities, SLOTS.find((s) => s.key === key)!.kind, String(params[key] ?? ''))
  const orbit = slot('orbit')
  const instrument = findPart(entities, 'instrument', instrumentIds(params)[0] ?? '')
  const rows: [string, Entity | undefined, string][] = [
    ['orbit', orbit, `${num(orbit, 'altitude_m') / 1000} km · ${(num(orbit, 'inclination_rad') * DEG).toFixed(1)}°`],
    ['launch_vehicle', slot('launch_vehicle'), `lifts ${report.budgets.mass_limit_kg} kg`],
    ['bus', slot('bus'), `${num(slot('bus'), 'dry_mass_kg')} kg dry`],
    ['instruments', instrument, `${rate(num(instrument, 'data_rate_bps'))} · ${num(instrument, 'power_w')} W`],
    ['comms', slot('comms'), rate(num(slot('comms'), 'data_rate_bps'))],
    ['solar', slot('solar'), `${num(slot('solar'), 'power_w')} W in sunlight`],
    ['battery', slot('battery'), `${num(slot('battery'), 'capacity_wh')} Wh`],
  ]
  return {
    name: headOf(mission.title),
    objective: String(params.objective_text ?? ''),
    startMs: Date.parse(mission.start_utc) || 0,
    earthRadius_m: Number(mission.entities.find((e) => e.id === 'earth')?.props.radius_m ?? 6371000),
    orbit: {
      name: orbit?.name ?? '',
      altitude_m: num(orbit, 'altitude_m'),
      inclination_rad: num(orbit, 'inclination_rad'),
      period_s: num(orbit, 'period_s') || 1,
      eclipse: num(orbit, 'eclipse_fraction'),
      contact_s: num(orbit, 'contact_s_per_day'),
    },
    solar_w: num(slot('solar'), 'power_w'),
    duty: num(instrument, 'duty_cycle'),
    slots: rows.map(([key, part, figure]) => ({ slot: STATION_NAMES[key] ?? key, part: part ? shortLabel(part) : 'Not picked', figure: part ? figure : '' })),
    budgets: report.budgets,
    flight: report.flight,
    calls: poll(report.issues),
    program: PROGRAM.map((id) => {
      const s = scenarios.find((c) => c.scenario_id === id)!
      const o = findPart(entities, 'orbit', String(s.params.orbit ?? ''))
      return {
        title: headOf(s.title),
        about: tailOf(s.title),
        body: String(o?.props.central_body ?? 'earth'),
        orbit: o ? shortLabel(o) : '',
        budget: formatUsd(Number(s.params.budget_usd ?? 0)),
        goal: Number(s.params.target_science_score ?? 0),
        years: Math.round(Number(s.params.mission_duration_s ?? 0) / (365 * 86400)),
      }
    }),
  }
}
export type Facts = ReturnType<typeof missionFacts>

// ---- Drawing. Every screen is laid out on 960 × 540 and scaled to its canvas.
type Ctx = CanvasRenderingContext2D
const FONT = '"Inter Tight", system-ui, sans-serif'
const BG = '#07090c'
const INK = '#f5f6f8'
const DIM = '#a0a3a8'
const LINE = 'rgba(245,246,248,0.2)'
const ACCENT = '#ffffff'
const GO = '#f5f6f8'
const WARN = '#a0a3a8'
const NO = '#ff7a7a'
/** The map on the ground-track screen, in 960 × 540 screen units. */
const MAP = { y: 48, h: 480 }
/** The marker runs this much faster than the orbit, so a few seconds of cutscene show it move. */
const TRACK_SPEED = 60
/** Northbound equator crossing off the mouth of the Amazon, and how far past it the shot opens. */
const LON0 = -50
const T0 = 0.1

function text(g: Ctx, s: string, x: number, y: number, size: number, color = INK, weight = 400, align: CanvasTextAlign = 'left') {
  g.font = `${weight} ${size}px ${FONT}`
  g.fillStyle = color
  g.textAlign = align
  g.fillText(s, x, y)
}

/** Canvas text has no tabular-numbers switch, so a ticking readout gets one fixed cell per character. */
function cells(g: Ctx, s: string, x: number, y: number, size: number, cell: number, color = INK, weight = 300) {
  for (let i = 0; i < s.length; i++) text(g, s[i]!, x + (i + 0.5) * cell, y, size, color, weight, 'center')
}

function wrap(g: Ctx, s: string, x: number, y: number, width: number, size: number, color = INK, lines = 9) {
  g.font = `400 ${size}px ${FONT}`
  let row = ''
  for (const word of s.split(' ')) {
    if (row && g.measureText(`${row} ${word}`).width > width) {
      if (--lines < 1) break
      text(g, row, x, y, size, color)
      y += size * 1.35
      row = word
    } else row = row ? `${row} ${word}` : word
  }
  if (lines > 0) text(g, row, x, y, size, color)
  return y + size * 1.35
}

function header(g: Ctx, title: string, right: string) {
  g.fillStyle = BG
  g.fillRect(0, 0, 960, 540)
  g.textBaseline = 'middle'
  g.fillStyle = ACCENT
  g.fillRect(24, 15, 4, 20)
  g.letterSpacing = '2px'
  text(g, title, 40, 26, 20, INK, 500)
  g.letterSpacing = '0px'
  text(g, right, 936, 26, 15, DIM, 400, 'right')
  g.fillStyle = LINE
  g.fillRect(0, 47, 960, 1)
}

function chip(g: Ctx, label: string, right: number, y: number, color: string, filled = true) {
  g.font = `500 22px ${FONT}`
  const w = g.measureText(label).width + 36
  g.fillStyle = color
  g.globalAlpha = filled ? 0.16 : 0
  g.fillRect(right - w, y - 20, w, 40)
  g.globalAlpha = 1
  g.strokeStyle = color
  g.lineWidth = 1.5
  g.strokeRect(right - w, y - 20, w, 40)
  text(g, label, right - w / 2, y + 1, 22, color, 500, 'center')
}

function track(g: Ctx, f: Facts, map?: CanvasImageSource) {
  const o = f.orbit
  header(g, 'GROUND TRACK', `${f.name}  ·  ${o.name}  ·  ${o.altitude_m / 1000} km  ·  ${(o.inclination_rad * DEG).toFixed(1)}°  ·  ${(o.period_s / 60).toFixed(1)} min`)
  g.fillStyle = '#101216'
  g.fillRect(0, MAP.y, 960, MAP.h)
  if (map) {
    g.drawImage(map, 0, MAP.y, 960, MAP.h)
    g.fillStyle = 'rgba(7,9,12,0.42)' // dim the photo so the track and grid read on top of it
    g.fillRect(0, MAP.y, 960, MAP.h)
  }
  const px = (lon: number) => ((lon + 180) / 360) * 960
  const py = (lat: number) => MAP.y + ((90 - lat) / 180) * MAP.h
  for (let d = -180; d <= 180; d += 30) {
    g.fillStyle = d === 0 ? 'rgba(245,246,248,0.34)' : 'rgba(245,246,248,0.14)'
    g.fillRect(px(d), MAP.y, 1, MAP.h)
    if (Math.abs(d) <= 90) g.fillRect(0, py(d), 960, 1)
    if (d > -180 && d < 180) text(g, `${Math.abs(d)}°${d < 0 ? 'W' : d > 0 ? 'E' : ''}`, px(d) + 4, MAP.y + MAP.h - 10, 11, 'rgba(245,246,248,0.6)')
  }
  // The orbit before, this one and the two after: each pass crosses the equator further west.
  const p = { lat: 0, lon: 0 }
  g.lineWidth = 2.5
  g.lineJoin = 'round'
  for (let n = -1; n <= 2; n++) {
    g.strokeStyle = n === 0 ? WARN : n < 0 ? 'rgba(245,246,248,0.35)' : 'rgba(245,246,248,0.7)'
    g.setLineDash(n > 0 ? [7, 7] : [])
    g.beginPath()
    let last = 0
    for (let s = 0; s <= 180; s++) {
      subPoint((n + s / 180) * o.period_s, o.inclination_rad, o.period_s, LON0, p)
      const x = px(p.lon)
      if (s === 0 || Math.abs(x - last) > 480) g.moveTo(x, py(p.lat))
      else g.lineTo(x, py(p.lat))
      last = x
    }
    g.stroke()
  }
  g.setLineDash([])
  const shift = (360 * o.period_s) / 86400
  g.fillStyle = 'rgba(7,9,12,0.78)'
  g.fillRect(16, MAP.y + 14, 318, 62)
  g.fillStyle = WARN
  g.fillRect(30, MAP.y + 33, 30, 3)
  text(g, 'This orbit', 70, MAP.y + 35, 14)
  for (let x = 160; x < 190; x += 12) g.fillRect(x, MAP.y + 33, 6, 3)
  text(g, 'Next two orbits', 200, MAP.y + 35, 14)
  text(g, `Each pass crosses ${shift.toFixed(1)}° further west  ·  shown ×${TRACK_SPEED}`, 30, MAP.y + 58, 13, DIM)
}

/** The satellite's spot on the ground-track screen `t` cutscene-seconds in, as 0 to 1 across and down the screen. */
function markerAt(f: Facts, t: number, p: { lat: number; lon: number }, out: { u: number; v: number }) {
  subPoint((T0 + (t * TRACK_SPEED) / f.orbit.period_s) * f.orbit.period_s, f.orbit.inclination_rad, f.orbit.period_s, LON0, p)
  out.u = (p.lon + 180) / 360
  out.v = (MAP.y + ((90 - p.lat) / 180) * MAP.h) / 540
  return out
}

const pad = (n: number) => String(n).padStart(2, '0')

function clock(g: Ctx, f: Facts, t: number) {
  header(g, 'MISSION CLOCK', f.name)
  const s = Math.floor(t)
  const now = new Date(f.startMs + s * 1000)
  text(g, 'COORDINATED UNIVERSAL TIME', 480, 96, 17, DIM, 500, 'center')
  cells(g, `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`, 480 - 4 * 74, 186, 132, 74)
  text(g, now.toISOString().slice(0, 10), 480, 276, 26, DIM, 400, 'center')
  g.fillStyle = LINE
  g.fillRect(60, 322, 840, 1)
  const b = f.budgets
  const tiles: [string, string][] = [
    ['ON CONSOLE', `T+ 00:${pad(Math.floor(s / 60))}:${pad(s % 60)}`],
    ['BUILD TIME', `${b.schedule_months} months`],
    ['LAUNCH DEADLINE', `${b.deadline_months} months`],
    ['MISSION LENGTH', `${b.mission_days} days`],
  ]
  tiles.forEach(([label, value], i) => {
    text(g, label, 60 + i * 215, 366, 15, DIM, 500)
    if (i === 0) cells(g, value, 60, 412, 34, 17, ACCENT, 400)
    else text(g, value, 60 + i * 215, 412, 34)
  })
  text(g, 'SHIFT 1  ·  FLIGHT DIRECTOR ON CONSOLE', 60, 486, 17, DIM, 500)
  g.fillStyle = GO
  g.beginPath()
  g.arc(888, 486, 6, 0, Math.PI * 2)
  g.fill()
}

function goNoGo(g: Ctx, f: Facts) {
  header(g, 'GO / NO-GO POLL', 'Launch readiness, console by console')
  f.calls.forEach((c, i) => {
    const y = 96 + i * 92
    text(g, c.label, 40, y - 14, 34, INK, 500)
    text(g, brief(c)?.problem ?? c.priority, 40, y + 22, 18, DIM)
    if (c.call === 'go') chip(g, 'GO', 920, y, GO)
    else if (c.call === 'no-go') chip(g, 'NO-GO', 920, y, NO)
    else chip(g, 'GO WITH CONCERNS', 920, y, WARN)
    g.fillStyle = LINE
    g.fillRect(40, y + 46, 880, 1)
  })
  const y = 96 + f.calls.length * 92
  text(g, 'FLIGHT', 40, y - 14, 34, ACCENT, 500)
  text(g, 'The flight director makes the launch call', 40, y + 22, 18, DIM)
  chip(g, 'YOUR CALL', 920, y, ACCENT, false)
}

function status(g: Ctx, f: Facts) {
  header(g, 'SPACECRAFT', `${f.name}  ·  ${f.budgets.mass_kg} kg at launch`)
  f.slots.forEach((row, i) => {
    const y = 84 + i * 66
    g.fillStyle = row.figure ? GO : WARN
    g.beginPath()
    g.arc(46, y, 6, 0, Math.PI * 2)
    g.fill()
    g.letterSpacing = '1.5px'
    text(g, row.slot.toUpperCase(), 70, y, 16, DIM, 500)
    g.letterSpacing = '0px'
    text(g, row.part, 250, y, 28)
    text(g, row.figure, 920, y, 22, ACCENT, 400, 'right')
    g.fillStyle = LINE
    g.fillRect(40, y + 33, 880, 1)
  })
}

function budgets(g: Ctx, f: Facts) {
  const b = f.budgets
  header(g, 'BUDGETS', 'Design against its limits')
  const one = (n: number) => String(Math.round(n * 10) / 10)
  // [label, used, limit, text, short of what it needs]
  const rows: [string, number, number, string, boolean][] = [
    ['MASS', b.mass_kg, b.mass_limit_kg, `${one(b.mass_kg)} of ${one(b.mass_limit_kg)} kg`, false],
    ['POWER', b.power_w, b.power_available_w, `${one(b.power_w)} of ${one(b.power_available_w)} W`, false],
    ['BATTERY', b.battery_needed_wh, b.battery_wh, `${one(b.battery_needed_wh)} of ${one(b.battery_wh)} Wh per eclipse`, false],
    ['DATA HOME', b.downlink_gb_per_day, b.data_generated_gb_per_day, `${b.downlink_gb_per_day.toFixed(2)} of ${b.data_generated_gb_per_day.toFixed(2)} GB per day`, b.downlink_gb_per_day < b.data_generated_gb_per_day],
    ['COST', b.cost_usd, b.budget_usd, `${formatUsd(b.cost_usd)} of ${formatUsd(b.budget_usd)}`, false],
    ['SCHEDULE', b.schedule_months, b.deadline_months, `${b.schedule_months} of ${b.deadline_months} months`, false],
  ]
  rows.forEach(([label, used, limit, value, short], i) => {
    const y = 88 + i * 76
    const bad = short || used > limit
    g.letterSpacing = '1.5px'
    text(g, label, 40, y - 12, 17, DIM, 500)
    g.letterSpacing = '0px'
    text(g, value, 920, y - 12, 24, bad ? WARN : INK, 400, 'right')
    g.fillStyle = 'rgba(245,246,248,0.14)'
    g.fillRect(40, y + 14, 880, 10)
    g.fillStyle = bad ? WARN : GO
    g.fillRect(40, y + 14, 880 * Math.min(1, limit > 0 ? used / limit : 0), 10)
  })
}

/** Two orbits of the power system, worked out from the same numbers the sim flies with. */
function telemetry(g: Ctx, f: Facts) {
  const { period_s, eclipse } = f.orbit
  header(g, 'TELEMETRY', `Two orbits  ·  ${(period_s / 60).toFixed(1)} min each  ·  shaded: Earth's shadow`)
  const load = f.flight.base_load_w + f.flight.instrument_load_w
  const dark = (phase: number) => phase % 1 > 1 - eclipse
  const [x0, w, N] = [250, 670, 240]
  // Battery: full at each sunset, drained by the load through the eclipse, refilled by what the array has to spare.
  const charge: number[] = []
  let wh = f.budgets.battery_wh
  for (let i = 0; i <= N; i++) {
    const hours = ((2 / N) * period_s) / 3600
    wh = Math.min(f.budgets.battery_wh, wh + (dark((i / N) * 2) ? -load : f.solar_w - load) * hours)
    charge.push(wh)
  }
  const plots: [string, string, string, number, number, (i: number) => number, string][] = [
    ['SOLAR ARRAY', `${f.solar_w} W`, 'in sunlight', 0, f.solar_w * 1.2, (i) => (dark((i / N) * 2) ? 0 : f.solar_w), WARN],
    ['BATTERY', `${f.budgets.battery_wh} Wh`, `dips ${(f.budgets.battery_wh - Math.min(...charge)).toFixed(1)} Wh a night`, 0, f.budgets.battery_wh * 1.2, (i) => charge[i]!, GO],
    // The camera is on for its duty cycle, in daylight, once an orbit.
    ['LOAD', `${load} W`, `${f.flight.base_load_w} W with camera off`, 0, load * 1.4, (i) => (((i / N) * 2) % 1 < f.duty ? load : f.flight.base_load_w), ACCENT],
  ]
  plots.forEach(([label, value, note, lo, hi, at, color], r) => {
    const top = 70 + r * 148
    const h = 112
    g.letterSpacing = '1.5px'
    text(g, label, 40, top + 14, 16, DIM, 500)
    g.letterSpacing = '0px'
    text(g, value, 40, top + 54, 38, INK, 300)
    text(g, note, 40, top + 92, 14, DIM)
    g.fillStyle = 'rgba(245,246,248,0.05)'
    g.fillRect(x0, top, w, h)
    g.fillStyle = 'rgba(16,18,22,0.9)'
    for (let n = 0; n < 2; n++) g.fillRect(x0 + ((n + 1 - eclipse) / 2) * w, top, (eclipse / 2) * w, h)
    g.fillStyle = LINE
    g.fillRect(x0, top + h, w, 1)
    g.fillRect(x0, top, 1, h)
    text(g, String(Math.round(hi)), x0 - 8, top + 6, 12, DIM, 400, 'right')
    text(g, String(lo), x0 - 8, top + h - 4, 12, DIM, 400, 'right')
    g.strokeStyle = color
    g.lineWidth = 2.5
    g.beginPath()
    for (let i = 0; i <= N; i++) {
      const y = top + h - ((at(i) - lo) / (hi - lo)) * h
      if (i === 0) g.moveTo(x0, y)
      else g.lineTo(x0 + (i / N) * w, y)
    }
    g.stroke()
  })
  for (let i = 0; i <= 4; i++) text(g, `${Math.round((i / 2) * (period_s / 60))} min`, x0 + (i / 4) * w, 524, 12, DIM, 400, i === 0 ? 'left' : i === 4 ? 'right' : 'center')
}

function earthCam(g: Ctx, f: Facts, globe?: CanvasImageSource) {
  const o = f.orbit
  header(g, 'EARTH VIEW', `Over the ${f.name} ground track`)
  g.fillStyle = '#000'
  g.fillRect(0, 48, 960, 492)
  if (globe) g.drawImage(globe, 40, 64, 460, 460)
  const speed = (2 * Math.PI * (f.earthRadius_m + o.altitude_m)) / o.period_s / 1000
  const rows: [string, string][] = [
    ['ALTITUDE', `${o.altitude_m / 1000} km`],
    ['SPEED', `${speed.toFixed(2)} km/s`],
    ['IN SUNLIGHT', `${Math.round((1 - o.eclipse) * 100)}% of each orbit`],
    ['GROUND CONTACT', `${Math.round(o.contact_s / 60)} min a day`],
    ['DATA HOME', `${Math.round(f.budgets.downlink_gb_per_day * 1000)} MB a day`],
  ]
  rows.forEach(([label, value], i) => {
    g.letterSpacing = '1.5px'
    text(g, label, 560, 104 + i * 86, 15, DIM, 500)
    g.letterSpacing = '0px'
    text(g, value, 560, 138 + i * 86, 30)
  })
}

function program(g: Ctx, f: Facts, globes: Record<string, CanvasImageSource | undefined>) {
  header(g, 'MISSION PROGRAM', `${f.program.length} missions  ·  finish one to unlock the next`)
  f.program.forEach((m, i) => {
    const x = 28 + i * 304
    g.strokeStyle = i === 0 ? ACCENT : LINE
    g.lineWidth = i === 0 ? 2 : 1
    g.strokeRect(x, 66, 296, 454)
    const globe = globes[m.body]
    if (globe) g.drawImage(globe, x + 20, 84, 120, 120)
    text(g, `0${i + 1}`, x + 276, 102, 34, i === 0 ? ACCENT : DIM, 300, 'right')
    text(g, i === 0 ? 'ON CONSOLE' : 'LOCKED', x + 276, 136, 13, i === 0 ? ACCENT : DIM, 500, 'right')
    text(g, m.title, x + 20, 240, 30, INK, 500)
    const y = wrap(g, m.about, x + 20, 276, 256, 16, DIM, 2)
    text(g, m.orbit, x + 20, y + 14, 18)
    const rows: [string, string][] = [['BUDGET', m.budget], ['SCIENCE GOAL', `${m.goal} points`], ['LENGTH', `${m.years} ${m.years === 1 ? 'year' : 'years'}`]]
    rows.forEach(([label, value], r) => {
      text(g, label, x + 20, 404 + r * 36, 13, DIM, 500)
      text(g, value, x + 276, 404 + r * 36, 20, INK, 400, 'right')
    })
  })
}

function rules(g: Ctx, f: Facts) {
  header(g, 'FLIGHT RULES', f.name)
  g.letterSpacing = '1.5px'
  text(g, 'OBJECTIVE', 40, 84, 15, ACCENT, 500)
  g.letterSpacing = '0px'
  const y = wrap(g, f.objective, 40, 118, 880, 23, INK, 4) + 14
  g.fillStyle = LINE
  g.fillRect(40, y, 880, 1)
  f.calls.forEach((c, i) => {
    const rowY = y + 44 + i * 62
    text(g, c.label, 40, rowY, 24, INK, 500)
    text(g, c.priority, 300, rowY, 24, DIM)
    g.fillStyle = LINE
    g.fillRect(40, rowY + 30, 880, 1)
  })
}

/** An orthographic view of a world from its equirectangular map, lit from the upper left. */
function globe(map: HTMLImageElement, size: number, lat0: number, lon0: number): HTMLCanvasElement {
  const src = document.createElement('canvas')
  const [w, h] = [(src.width = map.naturalWidth), (src.height = map.naturalHeight)]
  const out = document.createElement('canvas')
  out.width = out.height = size
  const [sg, og] = [src.getContext('2d'), out.getContext('2d')]
  if (!sg || !og) return out
  sg.drawImage(map, 0, 0)
  const from = sg.getImageData(0, 0, w, h).data
  const image = og.createImageData(size, size)
  const to = image.data
  const [r, sin0, cos0] = [size / 2 - 1, Math.sin(lat0 / DEG), Math.cos(lat0 / DEG)]
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const [x, y] = [(i + 0.5 - size / 2) / r, (size / 2 - j - 0.5) / r]
      const d = x * x + y * y
      if (d > 1) continue
      const z = Math.sqrt(1 - d)
      const lat = Math.asin(y * cos0 + z * sin0)
      const lon = lon0 / DEG + Math.atan2(x, z * cos0 - y * sin0)
      const u = Math.floor(((((lon / (2 * Math.PI) + 0.5) % 1) + 1) % 1) * w) % w
      const v = Math.min(h - 1, Math.floor((0.5 - lat / Math.PI) * h))
      const light = 0.05 + 1.15 * Math.max(0, Math.min(1, (-0.45 * x + 0.4 * y + 0.8 * z) * 1.6 + 0.15))
      const haze = Math.pow(1 - z, 3) * 0.55 * light // thin blue air towards the limb
      const [a, b] = [(v * w + u) * 4, (j * size + i) * 4]
      to[b] = Math.min(255, from[a]! * light * (1 - haze) + 110 * haze)
      to[b + 1] = Math.min(255, from[a + 1]! * light * (1 - haze) + 170 * haze)
      to[b + 2] = Math.min(255, from[a + 2]! * light * (1 - haze) + 255 * haze)
      to[b + 3] = 255 * Math.min(1, (1 - Math.sqrt(d)) * r)
    }
  }
  og.putImageData(image, 0, 0)
  return out
}

/** Wall order: the ground track is the big centre screen, the rest are its eight neighbours. */
export const SCREEN_IDS = ['track', 'clock', 'poll', 'budgets', 'telemetry', 'earth', 'status', 'program', 'rules'] as const
export type ScreenId = (typeof SCREEN_IDS)[number]

/**
 * One canvas per display, painted once. `update` repaints only what changed (the clock each second, the small
 * desk copy of the ground track twice a second, the map screens once when the maps have decoded) and reports
 * each repainted canvas to `touch`.
 */
export function controlScreens(touch: (canvas: HTMLCanvasElement) => void) {
  const facts = missionFacts()
  const maps = [earthUrl, moonUrl, marsUrl].map((src) => Object.assign(new Image(), { src }))
  const make = (width: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = (width * 9) / 16
    const g = canvas.getContext('2d')
    g?.scale(width / 960, width / 960)
    return { canvas, g }
  }
  // The centre wall screen is 7 m wide, so it gets the pixels; the clock repaints every second, so it stays small.
  const made = { ...Object.fromEntries(SCREEN_IDS.map((id) => [id, make(id === 'track' ? 1920 : id === 'clock' ? 640 : 1024)])), desk: make(480) } as Record<ScreenId | 'desk', ReturnType<typeof make>>
  const pics: Record<string, HTMLCanvasElement | undefined> = {}
  const point = { lat: 0, lon: 0 }
  const spot = { u: 0, v: 0 }
  const paintMaps = (map?: HTMLImageElement) => {
    if (made.track.g) track(made.track.g, facts, map)
    if (made.earth.g) earthCam(made.earth.g, facts, pics.earth)
    if (made.program.g) program(made.program.g, facts, pics)
  }
  paintMaps()
  if (made.poll.g) goNoGo(made.poll.g, facts)
  if (made.budgets.g) budgets(made.budgets.g, facts)
  if (made.telemetry.g) telemetry(made.telemetry.g, facts)
  if (made.status.g) status(made.status.g, facts)
  if (made.rules.g) rules(made.rules.g, facts)
  let mapped = false
  let second = -1
  let half = -1
  return {
    canvases: Object.fromEntries(Object.entries(made).map(([id, m]) => [id, m.canvas])) as Record<ScreenId | 'desk', HTMLCanvasElement>,
    /** The satellite's place on the ground-track screen, 0 to 1 across and down. */
    marker: (t: number) => markerAt(facts, t, point, spot),
    update(t: number) {
      if (!mapped && maps.every((m) => m.complete && m.naturalWidth > 0)) {
        mapped = true
        markerAt(facts, 0, point, spot)
        pics.earth = globe(maps[0]!, 490, point.lat - 8, point.lon + 6)
        pics.moon = globe(maps[1]!, 128, 8, 10)
        pics.mars = globe(maps[2]!, 128, 5, -70)
        paintMaps(maps[0])
        for (const id of ['track', 'earth', 'program'] as const) touch(made[id].canvas)
        half = -1
      }
      if (Math.floor(t) !== second) {
        second = Math.floor(t)
        if (made.clock.g) clock(made.clock.g, facts, t)
        touch(made.clock.canvas)
      }
      if (Math.floor(t * 2) !== half) {
        half = Math.floor(t * 2)
        const g = made.desk.g
        if (!g) return
        g.drawImage(made.track.canvas, 0, 0, 960, 540)
        markerAt(facts, t, point, spot)
        g.strokeStyle = '#fff'
        g.lineWidth = 3
        g.beginPath()
        g.arc(spot.u * 960, spot.v * 540, 12, 0, Math.PI * 2)
        g.stroke()
        touch(made.desk.canvas)
      }
    },
  }
}
