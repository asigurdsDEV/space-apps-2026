// What else is in the sky around each body, at its real size and distance. No three.js here.
// Numbers are from NASA's planetary fact sheets:
//   https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
//   https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html (Phobos and Deimos)
import { BODY_RADIUS_M, type Body } from './model'

type Vec3 = [number, number, number]

export interface Companion {
  name: string
  /** A body the planet shader draws, or a small dark rock. */
  look: Body | 'rock'
  /** Centre to centre, in radii of the body being orbited (world.ts draws that body with radius 1). */
  distance: number
  /** Half-axes in the same unit: [along the orbit, pole to pole, towards the planet]. */
  size: Vec3
  /** Laps around the planet for each turn of the planet on its axis. */
  lapsPerSpin: number
  /** Turns on its own axis per turn of the planet. Left out: one face always points at the planet. */
  turnsPerSpin?: number
  /** `equator`: circles over the planet's equator. `ecliptic`: circles in the plane that holds the Sun. */
  plane: 'equator' | 'ecliptic'
  /** Where it starts, in radians around the orbit from the Sun's side. */
  phase: number
}

const MOON_ORBIT_M = 384_400_000
const MOON_MONTH_D = 27.3217 // one orbit, and one turn on its axis
const EARTH_DAY_D = 0.99727
const MARS_DAY_D = 1.02596
const ball = (radius_m: number, around: Body): Vec3 => [radius_m / BODY_RADIUS_M[around], radius_m / BODY_RADIUS_M[around], radius_m / BODY_RADIUS_M[around]]
const km = (half_axes_km: Vec3, around: Body) => half_axes_km.map((a) => (a * 1000) / BODY_RADIUS_M[around]) as Vec3

export const COMPANIONS: Record<Body, Companion[]> = {
  earth: [
    { name: 'the Moon', look: 'moon', distance: MOON_ORBIT_M / BODY_RADIUS_M.earth, size: ball(BODY_RADIUS_M.moon, 'earth'), lapsPerSpin: EARTH_DAY_D / MOON_MONTH_D, plane: 'ecliptic', phase: 2.27 },
  ],
  moon: [
    // The Moon keeps one face to Earth, so from lunar orbit Earth stays over the same ground while it turns once a day.
    { name: 'Earth', look: 'earth', distance: MOON_ORBIT_M / BODY_RADIUS_M.moon, size: ball(BODY_RADIUS_M.earth, 'moon'), lapsPerSpin: 1, turnsPerSpin: MOON_MONTH_D / EARTH_DAY_D, plane: 'ecliptic', phase: 2.0 },
  ],
  mars: [
    // Phobos laps Mars three times a Martian day, so from the ground it rises in the west.
    { name: 'Phobos', look: 'rock', distance: 9_378_000 / BODY_RADIUS_M.mars, size: km([11.4, 9.1, 13.0], 'mars'), lapsPerSpin: MARS_DAY_D / 0.31891, plane: 'equator', phase: 2.4 },
    { name: 'Deimos', look: 'rock', distance: 23_459_000 / BODY_RADIUS_M.mars, size: km([6.0, 5.1, 7.8], 'mars'), lapsPerSpin: MARS_DAY_D / 1.26244, plane: 'equator', phase: 4.1 },
  ],
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const unit = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / length, a[1] / length, a[2] / length]
}
/** The unit vector of `a` with its part along `axis` taken out. */
export const without = (a: Vec3, axis: Vec3): Vec3 => unit([a[0] - dot(a, axis) * axis[0], a[1] - dot(a, axis) * axis[1], a[2] - dot(a, axis) * axis[2]])

/**
 * Where a companion is, in planet radii, with the planet's north pole along +y.
 * `spin` is how far the planet has turned (radians); `sun` is the unit vector to the Sun.
 * Everything here orbits the same way its planet turns.
 */
export function companionPosition(c: Companion, spin: number, sun: Vec3): Vec3 {
  const north: Vec3 = [0, 1, 0]
  const normal = c.plane === 'equator' ? north : without(north, sun)
  const start = c.plane === 'equator' ? without(sun, north) : sun
  const ahead = cross(normal, start)
  const angle = c.phase + spin * c.lapsPerSpin
  return [0, 1, 2].map((i) => c.distance * (Math.cos(angle) * start[i] + Math.sin(angle) * ahead[i])) as Vec3
}

// ---- The real stars ----
// The brightest stars in the sky, down to magnitude 3.5: name, right ascension (h m), declination (deg arcmin), visual
// magnitude, spectral class. Positions are J2000 as in the Yale Bright Star Catalogue (https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html),
// good to about a quarter of a degree. A star that could not be placed that well is left out, not guessed.
const STAR_TABLE = `Sirius,6 45.1,-16 43,-1.46,A;Canopus,6 24.0,-52 42,-0.74,F;Rigil Kentaurus,14 39.6,-60 50,-0.27,G;Arcturus,14 15.7,19 11,-0.05,K
Vega,18 36.9,38 47,0.03,A;Capella,5 16.7,46 0,0.08,G;Rigel,5 14.5,-8 12,0.13,B;Procyon,7 39.3,5 13,0.34,F;Achernar,1 37.7,-57 14,0.46,B
Betelgeuse,5 55.2,7 24,0.5,M;Hadar,14 3.8,-60 22,0.61,B;Altair,19 50.8,8 52,0.77,A;Acrux,12 26.6,-63 6,0.76,B;Aldebaran,4 35.9,16 31,0.85,K
Antares,16 29.4,-26 26,0.96,M;Spica,13 25.2,-11 10,0.97,B;Pollux,7 45.3,28 2,1.14,K;Fomalhaut,22 57.6,-29 37,1.16,A;Deneb,20 41.4,45 17,1.25,A
Mimosa,12 47.7,-59 41,1.25,B;Regulus,10 8.4,11 58,1.35,B;Adhara,6 58.6,-28 58,1.5,B;Castor,7 34.6,31 53,1.58,A;Shaula,17 33.6,-37 6,1.62,B
Gacrux,12 31.2,-57 7,1.63,M;Bellatrix,5 25.1,6 21,1.64,B;Elnath,5 26.3,28 36,1.65,B;Miaplacidus,9 13.2,-69 43,1.67,A;Alnilam,5 36.2,-1 12,1.69,B
Alnair,22 8.2,-46 58,1.74,B;Alnitak,5 40.8,-1 57,1.77,O;Alioth,12 54.0,55 58,1.76,A;gam Vel,8 9.5,-47 20,1.75,O;Mirfak,3 24.3,49 52,1.79,F
Kaus Australis,18 24.2,-34 23,1.79,B;Dubhe,11 3.7,61 45,1.81,K;Wezen,7 8.4,-26 24,1.83,F;Alkaid,13 47.5,49 19,1.85,B;Sargas,17 37.3,-43 0,1.86,F
Avior,8 22.5,-59 31,1.86,K;Menkalinan,5 59.5,44 57,1.9,A;Atria,16 48.7,-69 2,1.91,K;Alhena,6 37.7,16 24,1.93,A;Peacock,20 25.6,-56 44,1.94,B
del Vel,8 44.7,-54 43,1.93,A;Mirzam,6 22.7,-17 57,1.98,B;Alphard,9 27.6,-8 40,1.99,K;Polaris,2 31.8,89 16,1.97,F;Hamal,2 7.2,23 28,2.01,K
Algieba,10 20.0,19 50,2.01,K;Diphda,0 43.6,-17 59,2.04,K;Nunki,18 55.3,-26 18,2.05,B;Menkent,14 6.7,-36 22,2.06,K;Mirach,1 9.7,35 37,2.07,M
Alpheratz,0 8.4,29 5,2.07,B;Rasalhague,17 34.9,12 34,2.08,A;Kochab,14 50.7,74 9,2.07,K;Saiph,5 47.8,-9 40,2.07,B;Denebola,11 49.1,14 34,2.14,A
Algol,3 8.2,40 57,2.12,B;Almach,2 3.9,42 20,2.1,K;bet Gru,22 42.7,-46 53,2.07,M;Sadr,20 22.2,40 15,2.23,F;gam Cen,12 41.5,-48 58,2.17,A
Naos,8 3.6,-40 0,2.21,O;iot Car,9 17.1,-59 17,2.21,A;Schedar,0 40.5,56 32,2.24,K;Alphecca,15 34.7,26 43,2.22,A;Mizar,13 23.9,54 56,2.23,A
Suhail,9 8.0,-43 26,2.23,K;Mintaka,5 32.0,-0 18,2.25,O;Eltanin,17 56.6,51 29,2.24,K;Caph,0 9.2,59 9,2.28,F;Dschubba,16 0.3,-22 37,2.29,B
eps Sco,16 50.2,-34 18,2.29,K;eps Cen,13 39.9,-53 28,2.29,B;alp Lup,14 41.9,-47 23,2.3,B;eta Cen,14 35.5,-42 9,2.33,B;Merak,11 1.8,56 23,2.34,A
Izar,14 45.0,27 4,2.35,K;Enif,21 44.2,9 53,2.38,K;kap Sco,17 42.5,-39 2,2.39,B;Ankaa,0 26.3,-42 18,2.4,K;Phecda,11 53.8,53 42,2.41,A
Sabik,17 10.4,-15 43,2.43,A;Scheat,23 3.8,28 5,2.44,M;Alderamin,21 18.6,62 35,2.45,A;Aludra,7 24.1,-29 18,2.45,B;kap Vel,9 22.1,-55 1,2.47,B
gam Cas,0 56.7,60 43,2.4,B;Markab,23 4.8,15 12,2.49,B;eps Cyg,20 46.2,33 58,2.48,K;Menkar,3 2.3,4 5,2.54,M;zet Oph,16 37.2,-10 34,2.54,O
zet Cen,13 55.5,-47 17,2.55,B;Zosma,11 14.1,20 31,2.56,A;Acrab,16 5.4,-19 48,2.56,B;Arneb,5 32.7,-17 49,2.58,F;del Cen,12 8.4,-50 43,2.58,B
Gienah,12 15.8,-17 33,2.58,B;Ascella,19 2.6,-29 53,2.6,A;Zubeneschamali,15 17.0,-9 23,2.61,B;Unukalhai,15 44.3,6 26,2.63,K;Sheratan,1 54.6,20 48,2.64,A
Phact,5 39.6,-34 4,2.65,B;tet Aur,5 59.7,37 13,2.65,A;Kraz,12 34.4,-23 24,2.65,G;Ruchbah,1 25.8,60 14,2.66,A;Muphrid,13 54.7,18 24,2.68,G
bet Lup,14 58.5,-43 8,2.68,B;iot Aur,4 57.0,33 10,2.69,K;mu Vel,10 46.8,-49 25,2.69,G;alp Mus,12 37.2,-69 8,2.69,B;ups Sco,17 30.8,-37 18,2.7,B
pi Pup,7 17.1,-37 6,2.71,K;Kaus Media,18 21.0,-29 50,2.72,K;Tarazed,19 46.3,10 37,2.72,K;Zubenelgenubi,14 50.9,-16 3,2.75,A;del Oph,16 14.3,-3 42,2.73,M
eta Dra,16 24.0,61 31,2.73,G;tet Car,10 43.0,-64 24,2.74,B;Porrima,12 41.7,-1 27,2.74,F;iot Ori,5 35.4,-5 55,2.75,O;iot Cen,13 20.6,-36 43,2.75,A
Cebalrai,17 43.5,4 34,2.76,K;Kornephoros,16 30.2,21 29,2.78,G;Cursa,5 7.9,-5 5,2.78,A;Rastaban,17 30.4,52 18,2.79,G;del Cru,12 15.1,-58 45,2.79,B
gam Lup,15 35.1,-41 10,2.8,B;Nihal,5 28.2,-20 46,2.81,G;zet Her,16 41.3,31 36,2.81,G;bet Hyi,0 25.8,-77 15,2.82,G;tau Sco,16 35.9,-28 13,2.82,B
Kaus Borealis,18 28.0,-25 25,2.82,K;Algenib,0 13.2,15 11,2.83,B;rho Pup,8 7.5,-24 18,2.83,F;bet TrA,15 55.1,-63 26,2.83,F;zet Per,3 54.1,31 53,2.84,B
bet Ara,17 25.3,-55 32,2.84,K;alp Ara,17 31.8,-49 53,2.84,B;Alcyone,3 47.5,24 6,2.85,B;Vindemiatrix,13 2.2,10 58,2.85,G;Deneb Algedi,21 47.0,-16 8,2.85,A
alp Hyi,1 58.8,-61 34,2.86,F;del Cyg,19 45.0,45 8,2.86,B;Tejat,6 22.9,22 31,2.87,M;gam TrA,15 18.9,-68 41,2.87,A;alp Tuc,22 18.5,-60 16,2.87,K
Acamar,2 58.3,-40 18,2.88,A;pi Sgr,19 9.8,-21 1,2.88,F;Gomeisa,7 27.2,8 17,2.89,B;pi Sco,15 58.9,-26 7,2.89,B;eps Per,3 57.9,40 1,2.9,B
sig Sco,16 21.2,-25 36,2.9,B;Cor Caroli,12 56.0,38 19,2.89,A;Sadalsuud,21 31.6,-5 34,2.9,G;gam Per,3 4.8,53 30,2.91,G;ups Car,9 47.1,-65 4,2.92,A
Matar,22 43.0,30 13,2.93,G;tau Pup,6 49.9,-50 37,2.94,K;Algorab,12 29.9,-16 31,2.94,B;Sadalmelik,22 5.8,-0 19,2.95,G;Zaurak,3 58.0,-13 30,2.97,M
zet Tau,5 37.6,21 9,2.97,B;eps Leo,9 45.9,23 46,2.97,G;Alnasl,18 5.8,-30 25,2.98,K;gam Hya,13 18.9,-23 10,2.99,G;iot1 Sco,17 47.6,-40 8,2.99,F
zet Aql,19 5.4,13 52,2.99,A;bet Tri,2 9.5,34 59,3.0,A;psi UMa,11 9.7,44 30,3.0,K;Pherkad,15 20.7,71 50,3.0,A;mu1 Sco,16 51.9,-38 3,3.0,B
gam Gru,21 53.9,-37 22,3.0,B;del Per,3 42.9,47 47,3.01,B;Furud,6 20.3,-30 4,3.02,B;omi2 CMa,7 3.0,-23 50,3.02,B;eps Crv,12 10.1,-22 37,3.02,K
eps Aur,5 2.0,43 49,3.03,F;bet Mus,12 46.3,-68 6,3.04,B;Seginus,14 32.1,38 18,3.04,A;Dabih,20 21.0,-14 47,3.05,K;Mebsuta,6 43.9,25 8,3.06,G
Tania Australis,10 22.3,41 30,3.06,M;Altais,19 12.6,67 40,3.07,G;Albireo,19 30.7,27 58,3.08,K;eta Sgr,18 17.6,-36 46,3.1,M;zet Hya,8 55.4,5 57,3.11,G
nu Hya,10 49.6,-16 12,3.11,K;lam Cen,11 35.8,-63 1,3.11,B;alp Ind,20 37.6,-47 17,3.11,K;Wazn,5 51.0,-35 46,3.12,K;Talitha,8 59.2,48 2,3.12,A
zet Ara,16 58.6,-55 59,3.12,K;Sarin,17 15.0,24 50,3.12,A;kap Cen,14 59.2,-42 6,3.13,B;alp Lyn,9 21.1,34 24,3.14,K;N Vel,9 31.2,-57 2,3.16,K
pi Her,17 15.0,36 49,3.16,K;nu Pup,6 37.8,-43 12,3.17,B;tet UMa,9 32.9,51 41,3.17,F;zet Dra,17 8.8,65 43,3.17,B;phi Sgr,18 45.7,-26 59,3.17,B
eta Aur,5 6.5,41 14,3.18,B;alp Cir,14 42.5,-64 59,3.18,A;Tabit,4 49.8,6 58,3.19,F;eps Lep,5 5.5,-22 22,3.19,K;kap Oph,16 57.7,9 23,3.19,K
G Sco,17 49.9,-37 3,3.19,K;zet Cyg,21 12.9,30 14,3.21,G;Errai,23 39.3,77 38,3.21,K;del Lup,15 21.4,-40 39,3.22,B;Yed Posterior,16 18.3,-4 42,3.23,G
eta Ser,18 21.3,-2 54,3.23,K;Alfirk,21 28.7,70 34,3.23,B;alp Pic,6 48.2,-61 56,3.24,A;tet Aql,20 11.3,-0 49,3.24,B;sig Pup,7 29.2,-43 18,3.25,K
pi Hya,14 6.4,-26 41,3.25,K;Brachium,15 4.1,-25 17,3.25,M;Sulafat,18 58.9,32 41,3.25,B;gam Hyi,3 47.2,-74 14,3.26,M;del And,0 39.3,30 52,3.27,K
tet Oph,17 22.0,-25 0,3.27,B;Skat,22 54.6,-15 49,3.27,A;mu Lep,5 12.9,-16 12,3.29,B;ome Car,10 13.7,-70 2,3.29,B;Edasich,15 24.9,58 58,3.29,K
alp Dor,4 34.0,-55 3,3.3,A;p Car,10 32.0,-61 41,3.3,B;Propus,6 14.9,22 30,3.31,M;Rasalgethi,17 14.6,14 23,3.31,M;gam Ara,17 25.4,-56 23,3.31,B
bet Phe,1 6.1,-46 43,3.32,G;rho Per,3 5.2,38 50,3.32,M;Megrez,12 15.4,57 2,3.32,A;eta Sco,17 12.2,-43 14,3.32,F;nu Oph,17 59.0,-9 46,3.32,K
tau Sgr,19 6.9,-27 40,3.32,K;alp Ret,4 14.4,-62 28,3.33,G;Chertan,11 14.2,15 26,3.33,A;xi Pup,7 49.3,-24 52,3.34,G;Segin,1 54.4,63 40,3.35,B
eta Ori,5 24.5,-2 24,3.35,B;Muscida,8 30.3,60 43,3.35,G;del Aql,19 25.5,3 7,3.36,F;Alzirr,6 45.3,12 54,3.35,F;eps Lup,15 22.7,-44 41,3.37,B
Heze,13 34.7,-0 36,3.38,A;eps Hya,8 46.8,6 25,3.38,G;Meissa,5 35.1,9 56,3.39,O;q Car,10 17.1,-61 20,3.39,K;del Vir,12 55.6,3 24,3.39,M
zet Cep,22 10.9,58 12,3.39,K;tet2 Tau,4 28.7,15 52,3.4,A;gam Phe,1 28.4,-43 19,3.41,M;lam Tau,4 0.7,12 29,3.41,B;nu Cen,13 49.5,-41 41,3.41,B
zet Lup,15 12.3,-52 6,3.41,G;eta Cep,20 45.3,61 50,3.41,K;Homam,22 41.5,10 50,3.41,B;Mothallah,1 53.1,29 35,3.42,F;eta Lup,16 0.1,-38 24,3.42,B
mu Her,17 46.5,27 43,3.42,G;bet Pav,20 45.0,-66 12,3.42,A;a Car,9 11.0,-58 58,3.43,B;Adhafera,10 16.7,23 25,3.43,F;lam Aql,19 6.2,-4 53,3.43,B
Tania Borealis,10 17.1,42 55,3.45,A;Sheliak,18 50.1,33 22,3.45,B;Achird,0 49.1,57 49,3.46,G;eta Cet,1 8.6,-10 11,3.46,K;chi Car,7 56.8,-52 59,3.46,B
del Boo,15 15.5,33 19,3.46,G;gam Cet,2 43.3,3 14,3.47,A;eta Leo,10 7.3,16 46,3.48,A;eta Her,16 42.9,38 55,3.48,G;tau Cet,1 44.1,-15 56,3.49,G
sig CMa,7 1.7,-27 56,3.49,K;Alula Borealis,11 18.5,33 6,3.49,K;Nekkar,15 1.9,40 23,3.49,G;alp Tel,18 27.0,-45 58,3.49,B;eps Gru,22 48.6,-51 19,3.49,A
kap CMa,6 49.8,-32 31,3.5,B;Wasat,7 20.1,21 59,3.5,F;iot Cep,22 49.7,66 12,3.5,K;gam Sge,19 58.8,19 30,3.51,M;Sadalbari,22 50.0,24 36,3.51,G
Rana,3 43.2,-9 46,3.52,K;Subra,9 41.2,9 54,3.52,F;phi Vel,9 56.9,-54 34,3.52,B;xi2 Sgr,18 57.7,-21 6,3.52,K;Biham,22 10.2,6 12,3.52,A
Ain,4 28.6,19 11,3.53,K;Tarf,8 16.5,9 11,3.53,K;xi Hya,11 33.0,-31 51,3.54,G;mu Ser,15 49.6,-3 26,3.54,A;xi Ser,17 37.6,-15 24,3.54,F
Thuban,14 4.4,64 23,3.65,A`

export interface Star {
  name: string
  /** Right ascension in hours and declination in degrees (J2000). */
  ra_h: number
  dec_deg: number
  /** Visual magnitude: smaller is brighter. */
  mag: number
  /** Spectral class, hot and blue to cool and red: O B A F G K M. */
  kind: string
}

/** The real bright stars, brightest first. */
export function brightStars(): Star[] {
  const sixty = (text: string) => {
    const [whole, minutes] = text.split(' ').map(Number)
    return (text.startsWith('-') ? -1 : 1) * (Math.abs(whole!) + minutes! / 60)
  }
  return STAR_TABLE.split(/[;\n]/)
    .map((row) => row.split(','))
    .map(([name, ra, dec, mag, kind]) => ({ name: name!, ra_h: sixty(ra!), dec_deg: sixty(dec!), mag: Number(mag), kind: kind! }))
    .sort((a, b) => a.mag - b.mag)
}

const RAD = Math.PI / 180

/**
 * Unit vector to a place in the sky, in the sky's own frame: the Earth map's frame (shaders.ts `mapUv`) at a moment
 * when right ascension 0 is over Greenwich. North celestial pole on +Y, RA 0 on +X, RA growing toward -Z like east longitude.
 */
export function skyDirection(ra_h: number, dec_deg: number): Vec3 {
  const c = Math.cos(dec_deg * RAD)
  return [c * Math.cos(ra_h * 15 * RAD), Math.sin(dec_deg * RAD), -c * Math.sin(ra_h * 15 * RAD)]
}

/** Where the Sun is among the stars: [right ascension in hours, declination in degrees] (J2000), good to a tenth of a degree. */
export function sunInSky(date: Date): [number, number] {
  const days = (+date - Date.UTC(2000, 0, 1, 12)) / 86_400_000
  const g = (357.528 + 0.9856003 * days) * RAD
  // Along the ecliptic, then back to the year-2000 grid the star table uses: the grid's zero point drifts 50 arcseconds a year (precession).
  const along = (280.46 + 0.9856474 * days + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g) - 3.82e-5 * days) * RAD
  const tilt = 23.439 * RAD
  const ra = Math.atan2(Math.cos(tilt) * Math.sin(along), Math.cos(along)) / RAD / 15
  return [(ra + 24) % 24, Math.asin(Math.sin(tilt) * Math.sin(along)) / RAD]
}

/**
 * How far to turn the sky frame about +Y (radians) so it lines up with the Earth map at `date`: after the turn the Sun's
 * place among the stars sits over the map's own Sun (`sunDirection` in sun.ts), so the Sun is in the right constellation.
 */
export function skyTurn(date: Date, sunInMap: Vec3): number {
  return Math.atan2(-sunInMap[2], sunInMap[0]) - sunInSky(date)[0] * 15 * RAD
}

const GALAXY_POLE = skyDirection(12.857, 27.128) // the north pole of the Milky Way's disc
const GALAXY_CENTRE = skyDirection(17.761, -28.936) // Sagittarius A*
const GALAXY_SIDE = cross(GALAXY_POLE, GALAXY_CENTRE)
// Two small galaxies that orbit ours, each a faint patch in the far southern sky: [direction, width in degrees, brightness].
const MAGELLANIC_CLOUDS: [Vec3, number, number][] = [[skyDirection(5.39, -69.8), 3, 0.3], [skyDirection(0.88, -72.8), 1.6, 0.22]]

/**
 * How bright the Milky Way is toward `dir` (sky frame), 0 to 1: a mottled strip along the galactic plane, widest and
 * brightest toward the centre in Sagittarius, faint toward the far edge in Auriga, nothing near the galactic poles.
 * The dark dust lane of the Great Rift splits it from Cygnus down to the centre. Also the two Magellanic Clouds.
 * shortcut: the shape is drawn from these few rules, not from a photograph; use a real all-sky map if it must match cloud for cloud.
 */
export function milkyWay(dir: Vec3): number {
  const height = Math.asin(Math.max(-1, Math.min(1, dot(dir, GALAXY_POLE)))) / RAD
  const along = Math.atan2(dot(dir, GALAXY_SIDE), dot(dir, GALAXY_CENTRE)) / RAD
  const clouds = MAGELLANIC_CLOUDS.reduce((sum, [at, wide, light]) => sum + light * Math.exp(-((Math.acos(Math.min(1, dot(dir, at))) / RAD / wide) ** 2)), 0)
  if (Math.abs(height) > 40) return clouds
  const width = (5 + 6 * Math.exp(-((along / 38) ** 2))) * (1 + 0.25 * Math.sin(along / 13 + 0.6))
  const band = (0.22 + 0.78 * Math.exp(-((along / 75) ** 2))) * Math.exp(-(Math.abs(height / width) ** 1.6))
  const mottle = 0.72 + 0.2 * Math.sin(along / 7 + 1.3) * Math.sin(along / 19 + height / 3.5) + 0.12 * Math.sin(along / 2.9 + height / 1.9 + 0.7)
  const rift = along > -35 && along < 85 ? 0.6 * Math.sin(((along + 35) / 120) * Math.PI) * Math.exp(-(((height - 1.2 - 3 * Math.sin((along + 10) / 22)) / 2.2) ** 2)) : 0
  return Math.min(1, band * mottle * (1 - rift) + clouds)
}
