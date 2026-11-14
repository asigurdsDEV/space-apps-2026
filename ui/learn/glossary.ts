/** Student-facing definitions. Screens wrap words with `<Term id="...">`; they do not copy these strings. */

export interface GlossaryEntry {
  /** Stable kebab-case id, e.g. `delta-v`. */
  id: string
  /** What the player sees if `<Term>` has no children. */
  term: string
  /** One or two sentences. Plain language, no jargon left unexplained. */
  meaning: string
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    id: 'orbit',
    term: 'Orbit',
    meaning:
      'The path a spacecraft repeats around a planet or moon. A higher orbit sees more of the surface at once and can last longer, but it costs more fuel to reach.',
  },
  {
    id: 'payload-capacity',
    term: 'Payload capacity',
    meaning:
      'How much mass a rocket can lift to a chosen orbit. The same rocket lifts less to a higher or more distant orbit.',
  },
  {
    id: 'delta-v',
    term: 'Delta-v',
    meaning:
      'The total change in speed a rocket or spacecraft can make. Reaching a higher orbit, changing planes, or landing takes more delta-v, and that extra speed costs propellant mass.',
  },
  {
    id: 'eclipse',
    term: 'Eclipse',
    meaning:
      'The part of an orbit spent in a planet’s shadow. Solar panels make no power there, so the battery has to run the spacecraft until sunlight returns.',
  },
  {
    id: 'data-rate',
    term: 'Data rate',
    meaning:
      'How much data an instrument records each second. A sharper camera makes more data, which the radio then has to send home.',
  },
  {
    id: 'downlink',
    term: 'Downlink',
    meaning:
      'Sending data from the spacecraft to a ground station. The radio can only do this while a station is in view, so a huge data rate with a weak radio still loses science.',
  },
  {
    id: 'duty-cycle',
    term: 'Duty cycle',
    meaning:
      'The fraction of time a part is actually switched on. An instrument on for 10% of the orbit uses less power and records less data than one left on all the time.',
  },
  {
    id: 'reliability',
    term: 'Reliability',
    meaning:
      'The chance a rocket or spacecraft works as designed. 97% sounds safe, but it means about 1 launch in 33 fails.',
  },
  {
    id: 'power-budget',
    term: 'Power budget',
    meaning:
      'Power in versus power out. The source (usually solar panels plus a battery) has to cover every part that is on, including during eclipse.',
  },
]

const byId = new Map(GLOSSARY.map((entry) => [entry.id, entry]))

/** Ids the board asked for. Screens can rely on these existing. */
export const REQUIRED_TERM_IDS = [
  'orbit',
  'payload-capacity',
  'delta-v',
  'eclipse',
  'data-rate',
  'duty-cycle',
  'reliability',
] as const

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return byId.get(id)
}
