// Side-on sketch of the spacecraft the player has designed, from state.params and the catalog entities.
// Sizes use log scales because the catalog spans 3 kg CubeSats to 3 t flagships.

import type { Entity, SimState } from '../../shared'
import './spacecraft.css'

const W = 320
const H = 200
const CX = W / 2
const CY = H / 2

/** log10 of a numeric prop (-Infinity for 0), or of `fallback` when the prop is missing, negative or NaN. */
function log(entity: Entity, key: string, fallback: number): number {
  const v = entity.props[key]
  return Math.log10(typeof v === 'number' && v >= 0 ? v : fallback)
}

/** Keeps a size on the canvas whatever the catalog says (also turns +-Infinity into a bound). */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// One per instrument in the real catalog (10). An instrument's shape is picked by its place in the catalog,
// so it keeps its shape whatever else is picked.
const INSTRUMENT_SHAPES = [
  (x: number, y: number) => <circle cx={x} cy={y} r={5} />,
  (x: number, y: number) => <rect x={x - 5} y={y - 5} width={10} height={10} />,
  (x: number, y: number) => <polygon points={`${x},${y - 5} ${x + 5},${y + 5} ${x - 5},${y + 5}`} />,
  (x: number, y: number) => <polygon points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`} />,
  (x: number, y: number) => <polygon points={`${x - 5},${y - 5} ${x + 5},${y - 5} ${x},${y + 5}`} />,
  (x: number, y: number) => (
    <polygon points={`${x - 6},${y} ${x - 3},${y - 5} ${x + 3},${y - 5} ${x + 6},${y} ${x + 3},${y + 5} ${x - 3},${y + 5}`} />
  ),
  (x: number, y: number) => <path d={`M ${x - 2} ${y - 6} H ${x + 2} V ${y - 2} H ${x + 6} V ${y + 2} H ${x + 2} V ${y + 6} H ${x - 2} V ${y + 2} H ${x - 6} V ${y - 2} H ${x - 2} Z`} />,
  (x: number, y: number) => <rect x={x - 6} y={y - 3} width={12} height={6} />,
  (x: number, y: number) => <rect x={x - 3} y={y - 6} width={6} height={12} />,
  (x: number, y: number) => <path d={`M ${x - 6} ${y + 3} A 6 6 0 0 1 ${x + 6} ${y + 3} Z`} />,
]

export interface SpacecraftDrawingProps {
  state: SimState
}

export function SpacecraftDrawing({ state }: SpacecraftDrawingProps) {
  const p = state.params
  // Unknown ids (or ids of the wrong kind) find nothing and are simply not drawn.
  const find = (kind: string, id: unknown, type?: string) =>
    state.entities.find((e) => e.kind === kind && e.id === id && (!type || e.props.type === type))

  const bus = find('bus', p.bus)
  const solar = find('power_system', p.solar, 'solar')
  const rtg = find('power_system', p.solar, 'rtg')
  const battery = find('power_system', p.battery, 'battery')
  const comms = find('comms_system', p.comms)
  const instruments = [...new Set(String(p.instruments ?? '').split(',').map((id) => id.trim()))]
    .map((id) => find('instrument', id))
    .filter((e) => e !== undefined)
  const catalog = state.entities.filter((e) => e.kind === 'instrument')

  const names = [bus, solar ?? rtg, battery, comms].filter((e) => e !== undefined).map((e) => e.name)
  if (instruments.length > 0) {
    names.push(
      `${instruments.length} instrument${instruments.length === 1 ? '' : 's'} (${instruments.map((e) => e.name).join(', ')})`,
    )
  }
  if (!bus && names.length > 0) names.unshift('no bus')

  const h = bus ? clamp(15 + 6 * log(bus, 'dry_mass_kg', 10), 16, 40) : 22 // half the bus side: 18 (3U CubeSat) to 36 (flagship)
  const wing = solar ? clamp(20 * log(solar, 'power_w', 30), 10, 80) : 0 // 17 (7 W) to 76 (6 kW)
  const dish = comms ? clamp(3 * (log(comms, 'data_rate_bps', 1e6) - 2), 5, 20) : 0 // 6 (UHF) to 19 (Ka dish)
  const rim = CY - h - 6 - dish * 0.6
  const deck = CY + h + 4
  const step = Math.min(14, 300 / instruments.length) // squeeze a long row so it stays on the canvas

  return (
    <svg
      className="sc"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={names.length > 0 ? `Spacecraft: ${names.join(', ')}` : 'No spacecraft yet'}
    >
      {solar &&
        [-1, 1].map((side) => (
          <g key={side} className="sc-panel">
            <line x1={CX + side * h} y1={CY} x2={CX + side * (h + 6)} y2={CY} />
            <rect x={side < 0 ? CX - h - 6 - wing : CX + h + 6} y={CY - 14} width={wing} height={28} />
          </g>
        ))}
      {rtg && (
        <g className="sc-rtg">
          <line x1={CX + h} y1={CY} x2={CX + h + 14} y2={CY} />
          <rect x={CX + h + 14} y={CY - 7} width={30} height={14} rx={3} />
          {[6, 12, 18, 24].map((dx) => (
            <line key={dx} x1={CX + h + 14 + dx} y1={CY - 12} x2={CX + h + 14 + dx} y2={CY + 12} />
          ))}
        </g>
      )}
      {comms && (
        <g className="sc-dish">
          <line x1={CX} y1={CY - h} x2={CX} y2={rim - dish * 0.5} />
          <path d={`M ${CX - dish} ${rim} A ${dish} ${dish * 0.6} 0 0 0 ${CX + dish} ${rim} Z`} />
          <circle cx={CX} cy={rim - dish * 0.5} r={1.5} />
        </g>
      )}
      <rect
        className={bus ? 'sc-bus' : 'sc-bus sc-bus--none'}
        x={CX - h}
        y={CY - h}
        width={2 * h}
        height={2 * h}
        rx={4}
      />
      {battery && (
        <g className="sc-battery">
          <rect x={CX - h + 5} y={CY - h + 6} width={14} height={8} rx={1} />
          <rect x={CX - h + 19} y={CY - h + 8.5} width={2} height={3} />
        </g>
      )}
      {instruments.length > 0 && (
        <path
          d={`M ${CX} ${CY + h} V ${deck} M ${CX - (instruments.length * step) / 2} ${deck} H ${CX + (instruments.length * step) / 2}`}
        />
      )}
      {instruments.map((e, i) => (
        <g key={e.id} className="sc-instrument">
          {INSTRUMENT_SHAPES[catalog.indexOf(e) % INSTRUMENT_SHAPES.length](
            CX + (i - (instruments.length - 1) / 2) * step,
            deck + 7,
          )}
        </g>
      ))}
      {names.length === 0 && (
        <text className="sc-text" x={CX} y={CY + h + 24}>
          No spacecraft yet
        </text>
      )}
    </svg>
  )
}
