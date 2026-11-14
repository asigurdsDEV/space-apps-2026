// The real flight hardware every catalog part is modelled on, and the real dimensions the models use.
// Pure data, no imports: model.ts and layout.ts read sizes from here, REFERENCES.md explains each row.
// Meters, kilograms, watts. "est." marks a number read off NASA drawings or photos rather than quoted.

export interface Reference {
  /** The model that draws this row (a key of layout.ts). */
  model: string
  /** The flight hardware the model copies. */
  hardware: string
  /** The NASA mission it flew on. */
  mission: string
  /** Where the numbers come from. */
  url: string
}

const CDS = 'https://www.nasa.gov/wp-content/uploads/2018/01/cubesatdesignspecificationrev14_12022-02-09.pdf'
const MARCO = 'https://www.jpl.nasa.gov/news/press_kits/insight/launch/appendix/mars-cube-one/'
const MRO = 'https://www.jpl.nasa.gov/news/press_kits/mro-arrival.pdf'
const MAVEN = 'https://www.nasa.gov/wp-content/uploads/2015/03/maven_presskit_final2.pdf'
const SOA_POWER = 'https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/'
const SOA_COMMS = 'https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications/'
const M2020_POWER = 'https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/spacecraft/power/'

/** One row per catalog id. A test checks that every row of the four part catalogs is here. */
export const REFERENCES: Record<string, Reference> = {
  'cubesat-3u': { model: 'cubesat', hardware: '3U CubeSat structure (CubeSat Design Specification rev. 14.1)', mission: 'NASA CubeSat Launch Initiative', url: CDS },
  'cubesat-6u': { model: 'cubesat', hardware: 'MarCO 6U CubeSat bus', mission: 'Mars Cube One (InSight)', url: MARCO },
  'cubesat-12u': { model: 'cubesat', hardware: 'CAPSTONE 12U CubeSat bus with hydrazine thrusters', mission: 'CAPSTONE', url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2022-070A' },
  smallsat: { model: 'smallsat', hardware: 'GRAIL orbiter bus (Ebb and Flow)', mission: 'GRAIL', url: 'https://www.jpl.nasa.gov/news/press_kits/graiLaunch.pdf' },
  'medium-bus': { model: 'medium', hardware: 'MAVEN orbiter bus', mission: 'MAVEN', url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2013-063A' },
  'flagship-bus': { model: 'flagship', hardware: 'Mars Reconnaissance Orbiter bus, scaled up to the catalog mass', mission: 'Mars Reconnaissance Orbiter', url: MRO },

  'solar-body-panels': { model: 'body-cells', hardware: 'Body-mounted triple-junction cells on CubeSat faces', mission: 'NASA CubeSat Launch Initiative', url: SOA_POWER },
  'solar-deployable-small': { model: 'wings', hardware: 'MarCO deployable solar panels (two 30 x 30 cm wings, 35 W)', mission: 'Mars Cube One (InSight)', url: MARCO },
  'solar-deployable-large': { model: 'wings', hardware: 'LunaH-Map gimballed solar wings (90 W)', mission: 'LunaH-Map (Artemis I)', url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2022-156J' },
  'solar-array-medium': { model: 'wings', hardware: 'MAVEN gull-wing solar arrays', mission: 'MAVEN', url: MAVEN },
  'solar-array-large': { model: 'wings', hardware: 'MRO solar arrays (two 5.35 x 2.53 m wings, 6 kW at Earth)', mission: 'Mars Reconnaissance Orbiter', url: MRO },
  rtg: { model: 'rtg', hardware: 'Multi-Mission Radioisotope Thermoelectric Generator (MMRTG)', mission: 'Curiosity and Perseverance', url: 'https://science.nasa.gov/wp-content/uploads/2024/02/mmrtg-factsheet-updated-5-18-20-1.pdf' },
  'battery-small': { model: 'battery', hardware: 'Four-cell 18650 lithium-ion CubeSat pack', mission: 'NASA small spacecraft (state of the art report)', url: SOA_POWER },
  'battery-medium': { model: 'battery', hardware: 'Eight-cell 43 Ah lithium-ion battery (one of the rover pair)', mission: 'Curiosity and Perseverance', url: M2020_POWER },
  'battery-large': { model: 'battery', hardware: 'Bank of eight-cell 43 Ah lithium-ion batteries', mission: 'Curiosity and Perseverance', url: M2020_POWER },

  'uhf-radio': { model: 'turnstile', hardware: 'CubeSat UHF deployable tape antenna (four quarter-wave monopoles)', mission: 'NASA small spacecraft (state of the art report)', url: SOA_COMMS },
  's-band-patch': { model: 'patch', hardware: 'S-band patch antenna', mission: 'NASA small spacecraft (state of the art report)', url: SOA_COMMS },
  'x-band-transmitter': { model: 'reflectarray', hardware: 'MarCO Iris radio with the flat X-band reflectarray high-gain antenna', mission: 'Mars Cube One (InSight)', url: MARCO },
  'high-gain-dish': { model: 'dish-gimbal', hardware: 'LRO 75 cm Ka-band high-gain antenna on two gimbals', mission: 'Lunar Reconnaissance Orbiter', url: 'https://ipnpr.jpl.nasa.gov/progress_report/42-211/211A.pdf' },
  'deep-space-transponder': { model: 'dish-fixed', hardware: 'Mars Odyssey 1.3 m high-gain antenna with medium-gain horn and Small Deep Space Transponder', mission: '2001 Mars Odyssey', url: 'https://www.jpl.nasa.gov/news/press_kits/odysseylaunch.pdf' },
  'mars-hga': { model: 'dish-deep', hardware: 'MRO 3 m high-gain antenna with travelling-wave tube amplifiers', mission: 'Mars Reconnaissance Orbiter', url: MRO },

  'camera-basic': { model: 'camera', hardware: 'MarCO wide-field colour camera', mission: 'Mars Cube One (InSight)', url: MARCO },
  magnetometer: { model: 'magnetometer', hardware: 'MAVEN fluxgate magnetometer (MAG) on a boom', mission: 'MAVEN', url: MAVEN },
  'radiation-detector': { model: 'particles', hardware: 'Cosmic Ray Telescope for the Effects of Radiation (CRaTER)', mission: 'Lunar Reconnaissance Orbiter', url: 'https://science.nasa.gov/mission/lro/science-and-data/' },
  'ir-spectrometer': { model: 'spectrometer', hardware: 'OSIRIS-REx Thermal Emission Spectrometer (OTES)', mission: 'OSIRIS-REx', url: 'https://pds.nasa.gov/data/pds4/test-data/registry/orex.otes/document/otes_inst_paper.pdf' },
  'microwave-sounder': { model: 'sounder', hardware: 'Advanced Technology Microwave Sounder (ATMS)', mission: 'Suomi NPP and JPSS', url: 'https://www.earthdata.nasa.gov/data/instruments/atms' },
  'laser-altimeter': { model: 'altimeter', hardware: 'Lunar Orbiter Laser Altimeter (LOLA)', mission: 'Lunar Reconnaissance Orbiter', url: 'https://science.nasa.gov/wp-content/uploads/2024/01/lola-fact-sheet.pdf' },
  'multispectral-imager': { model: 'multispectral', hardware: 'Operational Land Imager (OLI)', mission: 'Landsat 8', url: 'https://science.nasa.gov/mission/landsat/oli/' },
  'subsurface-radar': { model: 'dipole-radar', hardware: 'Shallow Radar (SHARAD) 10 m dipole', mission: 'Mars Reconnaissance Orbiter', url: 'https://science.nasa.gov/mission/mars-reconnaissance-orbiter/science-instruments/' },
  'weather-imager': { model: 'weather-imager', hardware: 'Advanced Baseline Imager (ABI)', mission: 'GOES-R series', url: 'https://www.earthdata.nasa.gov/data/instruments/abi' },
  'uv-telescope': { model: 'telescope', hardware: 'GALEX 50 cm ultraviolet telescope', mission: 'Galaxy Evolution Explorer', url: 'https://www.jpl.nasa.gov/news/press_kits/galex.pdf' },
  'synthetic-aperture-radar': { model: 'sar', hardware: 'NISAR 12 m mesh radar reflector on its 9 m boom', mission: 'NISAR', url: 'https://science.nasa.gov/mission/nisar/about-the-satellite/' },
}

/** The row that stands in for a part the catalog has never seen: the first one that uses the same model. */
export function referenceFor(id: string, model: string): Reference | undefined {
  return REFERENCES[id] ?? Object.values(REFERENCES).find((r) => r.model === model)
}

export type Size3 = [number, number, number]

/** CubeSat Design Specification rev. 14.1: outer sizes as [x, y, z] with the long axis up, and the rail width. */
export const CUBESAT = {
  sizes: { 1: [0.1, 0.1135, 0.1], 2: [0.1, 0.227, 0.1], 3: [0.1, 0.3405, 0.1], 6: [0.2263, 0.366, 0.1], 12: [0.2263, 0.366, 0.2263] } as Record<number, Size3>,
  rail: 0.0085,
}

/** Box buses: body size [x, y, z] and dry mass of the real spacecraft. Other masses scale it by the cube root. */
export const BUS: Record<'smallsat' | 'medium' | 'flagship', { size: Size3; dry_kg: number }> = {
  // GRAIL: 1.09 m high, 0.95 m wide, 0.76 m deep, 201 kg dry (launch press kit).
  smallsat: { size: [0.95, 1.09, 0.76], dry_kg: 201 },
  // MAVEN: 2.3 x 2.3 m and 2 m high, 809 kg dry (NSSDCA, press kit).
  medium: { size: [2.3, 2.0, 2.3], dry_kg: 809 },
  // MRO: 6.5 m tall with its 3 m dish, 1,031 kg dry (press kit). The body box is est. from photos: the dish is about 1.4 x as wide as the bus.
  flagship: { size: [2.1, 3.0, 2.1], dry_kg: 1031 },
}

export interface WingRef { power_w: number; length: number; width: number; panels: number; mount: 'hinge' | 'drive' | 'yoke'; cant: number }
/** One wing of each real pair: watts of the pair at Earth, panel run [length x width], panel count, root, bend of the outer panel. */
export const WINGS: WingRef[] = [
  // MarCO: two 30 x 30 cm panels, 35 W near Earth; each folds in three (est. from JPL images).
  { power_w: 35, length: 0.3, width: 0.3, panels: 3, mount: 'hinge', cant: 0 },
  // LunaH-Map: 90 W on two gimballed wings; three 6U-face panels each (est. from NASA images).
  { power_w: 90, length: 0.9, width: 0.2, panels: 3, mount: 'drive', cant: 0 },
  // MAVEN: four panels in two gull wings, 12 m2, 11.43 m tip to tip around a 2.3 m bus; outer panels bent 20 degrees.
  // Its 1,150 to 1,700 W is at Mars; at Earth 12 m2 makes about 3,600 W at MRO's 300 W per m2.
  { power_w: 3600, length: 3.8, width: 1.58, panels: 2, mount: 'yoke', cant: (20 * Math.PI) / 180 },
  // MRO: each wing 5.35 x 2.53 m, 20 m2 and 6,000 W at Earth for the pair.
  { power_w: 6000, length: 5.35, width: 2.53, panels: 2, mount: 'yoke', cant: 0 },
]

/** MMRTG fact sheet: 64 cm across the fin tips, 66 cm long, 45 kg, 110 W, eight fins. Core diameter est. */
export const MMRTG = { diameter: 0.64, length: 0.66, mass_kg: 45, fins: 8, core: 0.26 }

/** 18650 cell: 18 mm across, 65 mm long, about 10 Wh. Rover battery: eight 43 Ah cells, about 1.2 kWh. */
export const BATTERY = { cell18650: { d: 0.018, l: 0.065, wh: 10 }, module_wh: 1200, moduleCells: 8 }

/** Real antenna sizes. */
export const ANTENNA = {
  // A quarter wave at 437 MHz, on a 10 x 10 cm board; an S-band patch is 7 x 7 cm; the Iris radio is 10.1 x 10.1 x 5.6 cm (state of the art report).
  uhfTape: 0.17,
  uhfBoard: 0.1,
  patch: 0.07,
  iris: [0.101, 0.056] as [number, number],
  // MarCO reflectarray: three panels, 59.7 x 33.5 cm unfolded (JPL).
  reflectarray: [0.597, 0.335] as [number, number],
  dish: { 'dish-gimbal': 0.75, 'dish-fixed': 1.3, 'dish-deep': 3.0 } as Record<string, number>,
  // Mars Odyssey's medium-gain horn is 7.1 cm wide and pokes through the 1.3 m dish.
  odysseyHorn: 0.071 / 1.3,
}

/** Real instrument sizes used for proportions. */
export const INSTRUMENT = {
  // SHARAD: two 5 m tubes, 10 m tip to tip.
  sharad: { length: 10, mass_kg: 15 },
  // NISAR: 12 m reflector on a 9 m boom.
  nisar: { reflector: 12, boom: 9 },
  // GALEX: 50 cm aperture; the satellite is 1 m wide and 2.5 m high.
  galex: { aperture: 0.5, tube: 0.58, length: 1.5 },
  // OTES: 37.5 x 28.9 x 52.2 cm, 15.2 cm telescope, 6.27 kg.
  otes: { size: [0.375, 0.289, 0.522] as Size3, aperture: 0.152 },
  // LOLA: 14 cm receiver telescope, one laser split into five beams.
  lola: { aperture: 0.14, beams: 5 },
}
