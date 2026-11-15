// Anomaly cards (decision 004): the deck from docs/game-design/ANOMALY_CARDS.md, encoded for the sim.
// Stories and wording are claude@sarah's; the numbers are game balance. Pure: no three, no I/O.
//
// A card is drawn on a scheduled mission day, the sim stops the clock, and `resolve_decision`
// applies the chosen option's effects. Everything the sim needs to remember sits in
// `state.metrics` (see CARD_METRICS in sim.ts), so the state stays flat JSON.

import type { Decision, Entity, Params, SimState } from '../shared'
import { findPart, num, partsOf, str } from './parts'

/** The small effects vocabulary of GAME_DESIGN.md §4.2. `for_days` makes a multiplier temporary. */
export type Effect =
  | { kind: 'lose_days'; days: number }
  | { kind: 'science_mult'; x: number; for_days?: number }
  | { kind: 'downlink_mult'; x: number; for_days?: number }
  | { kind: 'storage_mult'; x: number }
  | { kind: 'lose_stored_data' }
  | { kind: 'cost_usd'; usd: number }
  | { kind: 'end_mission'; reason: string; message: string }
  /** Roll once: below `p` apply `then` and report `then_text`, otherwise `otherwise`. */
  | { kind: 'chance'; p: number; then: Effect[]; otherwise: Effect[]; then_text: string; otherwise_text: string }

/** What a card may look at: the design as flown and where the mission is. */
export interface CardContext {
  /** Whole days since operations began. */
  ops_day: number
  body: string
  altitude_km: number
  stored_gb: number
  budget_usd: number
  /** The chosen bus's reliability divided by the best bus's in the catalog (0 to 1). */
  bus_factor: number
  solar_type: string
  /** 'none' | 'small' | 'mid' | 'large': the chosen battery's place among the catalog's batteries. */
  battery: 'none' | 'small' | 'mid' | 'large'
  /** The chosen radio is faster than the slowest in the catalog. */
  fast_radio: boolean
  /** NOAA level (3 to 5) of the real storm that triggered the storm card, 0 when storms are not real data. */
  storm_g: number
}

/**
 * Real storm days from NASA OMNI (app/ sets `real_storms` = "day:G,…" from data/space-weather, day =
 * whole days since launch, and `weather_start` = the real date of launch day). Empty when not set.
 */
export function realStormList(params: Params): { day: number; g: number }[] {
  return str(params, 'real_storms')
    .split(',')
    .filter(Boolean)
    .map((pair) => pair.split(':').map(Number))
    .filter(([day, g]) => Number.isFinite(day) && Number.isFinite(g))
    .map(([day, g]) => ({ day: day!, g: g! }))
}

/** The real date of mission day `day` (YYYY-MM-DD), or '' when `weather_start` is not set. */
export function realDate(params: Params, day: number): string {
  const start = Date.parse(str(params, 'weather_start').slice(0, 10))
  return Number.isNaN(start) ? '' : new Date(start + day * 86_400_000).toISOString().slice(0, 10)
}

interface CardOption {
  id: 'a' | 'b'
  label: string
  effect_text: string
  effects: (ctx: CardContext) => Effect[]
}

export interface Card {
  id: string
  title: string
  body: string
  /** The co-op role that answers it. */
  console: 'mission-planning' | 'spacecraft' | 'science' | 'comms-resources'
  when: (ctx: CardContext) => boolean
  options: [CardOption, CardOption]
  story: NonNullable<Decision['story']>
}

export function cardContext(params: Params, entities: Entity[], ops_day: number, stored_gb: number, budget_usd: number, storm_g = 0): CardContext {
  const orbit = findPart(entities, 'orbit', str(params, 'orbit'))
  const bus = findPart(entities, 'bus', str(params, 'bus'))
  const best = Math.max(0, ...partsOf(entities, 'bus').map((b) => num(b.props, 'reliability')))
  const power = partsOf(entities, 'power_system')
  const sizes = power.filter((p) => p.props.type === 'battery').map((p) => num(p.props, 'capacity_wh')).sort((a, b) => a - b)
  const battery = findPart(entities, 'power_system', str(params, 'battery'))
  const wh = battery ? num(battery.props, 'capacity_wh') : 0
  const radios = partsOf(entities, 'comms_system').map((c) => num(c.props, 'data_rate_bps'))
  const radio = findPart(entities, 'comms_system', str(params, 'comms'))
  return {
    ops_day,
    body: orbit ? str(orbit.props, 'central_body', 'earth') : 'earth',
    altitude_km: orbit ? num(orbit.props, 'altitude_m') / 1000 : 0,
    stored_gb,
    budget_usd,
    bus_factor: bus && best > 0 ? Math.min(1, num(bus.props, 'reliability') / best) : 1,
    solar_type: str(findPart(entities, 'power_system', str(params, 'solar'))?.props ?? {}, 'type'),
    battery: !battery || wh <= sizes[0] ? (battery ? 'small' : 'none') : wh >= sizes[sizes.length - 1] ? 'large' : 'mid',
    fast_radio: !!radio && radios.length > 0 && num(radio.props, 'data_rate_bps') > Math.min(...radios),
    storm_g,
  }
}

const COARSE: Effect = { kind: 'science_mult', x: 0.6 }
const BACKUP_ANTENNA: Effect = { kind: 'downlink_mult', x: 0.25 }

export const CARDS: Card[] = [
  {
    id: 'reaction-wheel',
    title: 'Reaction wheel failure',
    body: "One of the spinning wheels that points your spacecraft has stopped. You can't hold your instruments steady on targets.",
    console: 'spacecraft',
    when: (c) => c.ops_day >= 30,
    options: [
      { id: 'a', label: 'Switch to coarse pointing', effect_text: 'Science −40% from now on. No risk.', effects: () => [COARSE] },
      {
        id: 'b',
        label: 'Restart the wheel',
        effect_text: "Good chance it's fixed. If not, 5 days in safe mode and coarse pointing anyway.",
        effects: (c) => [
          {
            kind: 'chance',
            p: 0.6 * c.bus_factor,
            then: [],
            otherwise: [{ kind: 'lose_days', days: 5 }, COARSE],
            then_text: 'The wheel restarted. Pointing is back to normal.',
            otherwise_text: 'The wheel seized: 5 days in safe mode, and coarse pointing from now on.',
          },
        ],
      },
    ],
    story: {
      mission: 'Kepler',
      year: 2013,
      text: "NASA's Kepler planet-hunting telescope lost the second of its four reaction wheels and could no longer point precisely. Engineers balanced it using the pressure of sunlight and flew a new mission, K2, for years more.",
      source_url: 'https://science.nasa.gov/mission/kepler/',
    },
  },
  {
    id: 'antenna-stuck',
    title: "High-gain antenna won't open",
    body: "Your main antenna is stuck half open. You can still talk through the small backup antenna, but it's far slower.",
    console: 'comms-resources',
    when: (c) => c.ops_day <= 10 && c.fast_radio,
    options: [
      { id: 'a', label: 'Use backup antenna', effect_text: 'Downlink drops to a quarter. Safe.', effects: () => [BACKUP_ANTENNA] },
      {
        id: 'b',
        label: 'Keep pulsing the motor',
        effect_text: 'Small chance it pops open. If not, 3 lost days and the backup anyway.',
        effects: () => [
          {
            kind: 'chance',
            p: 0.3,
            then: [],
            otherwise: [{ kind: 'lose_days', days: 3 }, BACKUP_ANTENNA],
            then_text: 'The antenna popped open. Full downlink is back.',
            otherwise_text: 'It stayed stuck: 3 days lost, and the backup antenna from now on.',
          },
        ],
      },
    ],
    story: {
      mission: 'Galileo',
      year: 1991,
      text: "Galileo's high-gain antenna jammed partly open on the way to Jupiter. The team pulsed its motor thousands of times without success, then rewrote the software to compress data and sent it home through the small low-gain antenna, and still returned most of the planned science.",
      source_url: 'https://science.nasa.gov/mission/galileo/',
    },
  },
  {
    id: 'geomagnetic-storm',
    title: 'Solar storm swells the atmosphere',
    body: "A burst from the Sun is heating Earth's upper atmosphere, and it puffs up. More air at your altitude means more drag pulling you down.",
    console: 'mission-planning',
    when: (c) => c.body === 'earth' && c.altitude_km < 1000,
    options: [
      { id: 'a', label: 'Go to safe mode', effect_text: 'Lose 2 days of science. Drag mostly avoided.', effects: () => [{ kind: 'lose_days', days: 2 }] },
      {
        id: 'b',
        label: 'Keep observing',
        effect_text: "Fine if you're high enough. Very risky in a low orbit.",
        effects: (c) => [
          {
            kind: 'chance',
            // A real storm's NOAA level scales the drag risk: G3 half, G4 as is, G5 one and a half.
            p: (c.altitude_km < 400 ? 0.25 : c.altitude_km <= 600 ? 0.08 : 0.01) * (c.storm_g >= 3 ? (c.storm_g - 2) / 2 : 1),
            then: [{ kind: 'end_mission', reason: 'reentry', message: 'Drag pulled the spacecraft down and it re-entered the atmosphere.' }],
            otherwise: [],
            then_text: 'The extra drag was too much: the spacecraft re-entered.',
            otherwise_text: 'The storm passed. Your orbit held and no science was lost.',
          },
        ],
      },
    ],
    story: {
      mission: 'Starlink',
      year: 2022,
      text: "In February 2022, a geomagnetic storm raised drag on a batch of 49 newly launched Starlink satellites still in a very low orbit. 38 of them couldn't climb away and re-entered the atmosphere.",
      source_url: 'https://repository.library.noaa.gov/view/noaa/53091',
    },
  },
  {
    id: 'memory-fault',
    title: 'On-board memory errors',
    body: "Your spacecraft's computer keeps rebooting because its data storage is corrupted.",
    console: 'science',
    when: (c) => c.stored_gb > 0,
    options: [
      {
        id: 'a',
        label: 'Reformat the storage',
        effect_text: 'Lose everything not yet sent home, and 1 day.',
        effects: () => [{ kind: 'lose_stored_data' }, { kind: 'lose_days', days: 1 }],
      },
      { id: 'b', label: 'Run on half memory', effect_text: 'Keep your data, but storage is half the size from now on.', effects: () => [{ kind: 'storage_mult', x: 0.5 }] },
    ],
    story: {
      mission: 'Spirit rover',
      year: 2004,
      text: "Two weeks after landing on Mars, NASA's Spirit rover got stuck rebooting because of a problem with its flash memory. Engineers diagnosed it from Earth and fixed it by reformatting the memory, and Spirit went on to drive for years.",
      source_url: 'https://science.nasa.gov/mission/mer-spirit/',
    },
  },
  {
    id: 'dust-storm',
    title: 'Planet-wide dust storm',
    body: 'A dust storm is wrapping the whole planet, and sunlight on your solar panels is falling fast.',
    console: 'spacecraft',
    when: (c) => c.body === 'mars' && c.solar_type === 'solar',
    options: [
      { id: 'a', label: 'Hibernate until it clears', effect_text: 'Lose 12 days. The spacecraft survives.', effects: () => [{ kind: 'lose_days', days: 12 }] },
      {
        id: 'b',
        label: 'Keep working on battery',
        effect_text: 'Bigger battery, better odds. If it holds: a little less science for 12 days.',
        effects: (c) => [
          {
            kind: 'chance',
            p: c.battery === 'large' ? 0.05 : c.battery === 'mid' ? 0.2 : 0.5,
            then: [{ kind: 'end_mission', reason: 'power_loss', message: 'The battery ran flat in the dust storm and the spacecraft never woke up.' }],
            otherwise: [{ kind: 'science_mult', x: 0.8, for_days: 12 }],
            then_text: 'The battery ran flat. The spacecraft went silent.',
            otherwise_text: 'The battery held. Science is down 20% for 12 days while the dust clears.',
          },
        ],
      },
    ],
    story: {
      mission: 'Opportunity rover',
      year: 2018,
      text: "A global dust storm on Mars blocked the sunlight that powered NASA's Opportunity rover. It went silent in June 2018 and never woke up, after nearly 15 years of driving. Curiosity, powered by a nuclear generator instead of solar panels, kept working through the same storm.",
      source_url: 'https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/',
    },
  },
  {
    id: 'lost-contact',
    title: 'Spacecraft goes silent',
    body: 'Your spacecraft stopped answering after a routine command. It might be spinning out of control, or just pointed the wrong way.',
    console: 'comms-resources',
    when: (c) => c.ops_day >= 20,
    options: [
      {
        id: 'a',
        label: 'Pay for a search',
        effect_text: "Costs 3% of your budget and 6 days, but you'll find it.",
        effects: (c) => [{ kind: 'cost_usd', usd: 0.03 * c.budget_usd }, { kind: 'lose_days', days: 6 }],
      },
      {
        id: 'b',
        label: 'Wait and hope',
        effect_text: 'Free, but you might lose it for good.',
        effects: (c) => [
          {
            kind: 'chance',
            p: 0.55 * c.bus_factor,
            then: [{ kind: 'lose_days', days: 15 }],
            otherwise: [{ kind: 'end_mission', reason: 'lost_contact', message: 'The spacecraft never answered again.' }],
            then_text: 'It recovered by itself after 15 silent days.',
            otherwise_text: 'It never answered again. The mission is over.',
          },
        ],
      },
    ],
    story: {
      mission: 'SOHO',
      year: 1998,
      text: 'The Sun-watching SOHO observatory (ESA and NASA) lost contact in June 1998 after a command error sent it spinning. Teams found it by bouncing radar signals off it, slowly brought it back, and resumed science later that year.',
      source_url: 'https://www.esa.int/Newsroom/Press_Releases/SOHO_spacecraft_located_with_ground-based_radar',
    },
  },
  {
    id: 'radiation-zone',
    title: 'Radiation hits in the South Atlantic Anomaly',
    body: 'Every few orbits you pass through a patch of strong radiation over the South Atlantic, and your instruments are glitching.',
    console: 'spacecraft',
    when: (c) => c.body === 'earth' && c.altitude_km < 2000,
    options: [
      { id: 'a', label: 'Pause science each pass', effect_text: 'About 10% less science from now on.', effects: () => [{ kind: 'science_mult', x: 0.9 }] },
      {
        id: 'b',
        label: 'Keep observing through it',
        effect_text: 'Usually fine. Sometimes a reboot costs 3 days.',
        effects: () => [
          {
            kind: 'chance',
            p: 0.35,
            then: [{ kind: 'lose_days', days: 3 }],
            otherwise: [],
            then_text: 'A radiation hit forced a reboot: 3 days lost.',
            otherwise_text: 'The instruments rode it out. Nothing lost.',
          },
        ],
      },
    ],
    story: {
      mission: 'Inspired by Hubble and many satellites in low orbit',
      year: 'ongoing',
      text: "Earth's radiation belts dip closest to the surface over the South Atlantic. Hubble and many other satellites in low orbit routinely pause sensitive work while passing through it.",
      source_url: 'https://www.nasa.gov/missions/icon/nasa-researchers-track-slowly-splitting-dent-in-earths-magnetic-field/',
    },
  },
  {
    id: 'station-bumped',
    title: 'Ground station time bumped',
    body: "A higher-priority mission needs the big antennas this week, and you're losing most of your passes.",
    console: 'comms-resources',
    when: () => true,
    options: [
      { id: 'a', label: 'Rent commercial stations', effect_text: 'Costs 2% of your budget. No data delay.', effects: (c) => [{ kind: 'cost_usd', usd: 0.02 * c.budget_usd }] },
      { id: 'b', label: 'Wait it out', effect_text: 'Free, but data piles up for a week. Watch your storage.', effects: () => [{ kind: 'downlink_mult', x: 0.4, for_days: 7 }] },
    ],
    story: {
      mission: 'Inspired by the Deep Space Network',
      year: 'ongoing',
      text: "NASA's Deep Space Network has only three sites, in California, Spain and Australia, shared by dozens of missions. Antenna time is scheduled in advance, and high-priority events like launches can take precedence.",
      source_url: 'https://www.nasa.gov/directorates/somd/space-communications-navigation-program/what-is-the-deep-space-network/',
    },
  },
  {
    id: 'debris-pass',
    title: 'Space debris close pass',
    body: 'Tracking radar shows a piece of an old, broken satellite will pass very close to your spacecraft. Nobody can be sure it will miss.',
    console: 'mission-planning',
    when: (c) => c.body === 'earth',
    options: [
      { id: 'a', label: 'Fire thrusters to dodge', effect_text: 'Science stops for 1 day during the burn. The debris misses.', effects: () => [{ kind: 'lose_days', days: 1 }] },
      {
        id: 'b',
        label: 'Hold course',
        effect_text: 'It will probably miss. If it hits, the mission is over.',
        effects: (c) => [
          {
            kind: 'chance',
            // Tracked debris is thickest from about 750 to 1,000 km, thinner near 400 km (drag clears it) and far thinner at geostationary height.
            p: c.altitude_km < 500 ? 0.02 : c.altitude_km <= 2000 ? 0.05 : 0.01,
            then: [{ kind: 'end_mission', reason: 'debris_hit', message: 'A piece of space debris hit the spacecraft and destroyed it.' }],
            otherwise: [],
            then_text: 'The debris hit. The spacecraft broke apart.',
            otherwise_text: 'The debris passed by. Nothing was lost.',
          },
        ],
      },
    ],
    story: {
      mission: 'Iridium 33 and Cosmos 2251',
      year: 2009,
      text: 'In 2009 a working satellite, Iridium 33, and a dead one, Cosmos 2251, crashed into each other and left thousands of tracked pieces in orbit. The International Space Station has fired its thrusters to dodge debris more than 30 times since 1999. It moves when the chance of a hit passes about 1 in 10,000.',
      source_url: 'https://orbitaldebris.jsc.nasa.gov/faq/',
    },
  },
]

export function cardById(id: string): Card | undefined {
  return CARDS.find((card) => card.id === id)
}

/** The `decision_required` payload for a card. A storm card from real data names its real date. */
export function decisionOf(card: Card, decision_id: string, params?: Params): Decision {
  return {
    decision_id,
    card_id: card.id,
    title: card.title,
    body: card.body,
    console: card.console,
    options: card.options.map(({ id, label, effect_text }) => ({ id, label, effect_text })),
    story: (params && realStoryOf(card, decision_id, params)) ?? card.story,
  }
}

/** For the storm card on a real storm day: the real date and NOAA level, sourced to NASA OMNI. */
function realStoryOf(card: Card, decision_id: string, params: Params): Decision['story'] | undefined {
  if (card.id !== 'geomagnetic-storm') return undefined
  const day = Number(decision_id.slice(card.id.length + 1))
  const storm = realStormList(params).find((s) => s.day === day)
  const date = realDate(params, day)
  if (!storm || !date) return undefined
  return {
    mission: 'NASA OMNI space weather',
    year: date,
    text: `This storm really happened: NASA's OMNI data shows a G${storm.g} geomagnetic storm on ${date}, and your mission is flying through it. In February 2022 a much weaker G1 storm raised drag enough to bring down 38 of 49 new Starlink satellites.`,
    source_url: 'https://spdf.gsfc.nasa.gov/pub/data/omni/low_res_omni/',
  }
}

/**
 * Mission days (whole days from launch) on which a card is drawn: one per equal slice of the
 * operations phase, at least a week apart. `rolls` are uniform numbers in [0, 1), one per card.
 */
export function cardSchedule(count: number, opsStartDay: number, endDay: number, rolls: number[]): number[] {
  const slice = (endDay - opsStartDay) / count
  if (count <= 0 || !(slice >= 2)) return []
  return rolls.slice(0, count).map((roll, i) => Math.floor(opsStartDay + i * slice + 1 + roll * Math.max(0, slice - 8)))
}

/** The card waiting for an answer, rebuilt from the state alone (so a late joiner or a reload still sees it). */
export function pendingDecision(state: Pick<SimState, 'metrics'> & Partial<Pick<SimState, 'params'>>): Decision | null {
  const id = state.metrics.decision_id
  const card = cardById(String(state.metrics.decision_card ?? ''))
  return card && typeof id === 'string' && id ? decisionOf(card, id, state.params) : null
}
