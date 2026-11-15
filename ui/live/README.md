# Live Earth

One screen: the real Earth right now. A globe carrying the latest full day of satellite imagery, lit by the Sun where it stands this minute, with real satellites and tracked debris where they are this second, a close-approach screening, space weather and open storms. No API key, no account, nothing about the player in any request (no cookies, no referrer, fixed URLs), except the address a player types into **Fly to a place**, which goes to OpenStreetMap once when they press Go.

## The screen

`LiveEarth.tsx` (default export, `{ onClose }`) is a full-window modal `<dialog>` put on `document.body`, so it looks and behaves the same wherever it is opened. Back or Esc closes it and the browser gives the focus back to the button that opened it. It is imported lazily from two places and nothing else in the game knows about it:

- the Classic mission screen, in the bar beside "Survey the planet" (`app/App.tsx`). Solo, the mission clock waits while it is open; the mission screen under it is not laid out, so its 3D view stops drawing.
- the 3D game's Mission menu (`app/WorldMenu.tsx`), in every phase.

Preview: `/ui/live/preview.html` (`?closed` starts with it shut).

| File | What it is |
|---|---|
| `LiveEarth.tsx`, `live.css` | The dialog, two glass panels, the toggles, and the same things in words for screen readers |
| `scene.ts` | Its own small three.js scene: six draw calls (globe, air, satellites, debris, storms, the picked orbit); names are HTML over the canvas |
| `earthShader.ts` | The game's Earth shader (`ui/scene3d`) with the live picture spliced in over the bundled map |
| `text.ts` | Every sentence and number format on the panel, tested |
| the rest | The data layer below: no React and no three.js; import it from `index.ts` |

How it behaves:

- **Opens at once** with the bundled Earth; each layer appears when its feed answers and the picture fades in over 1.2 s. The globe's place and size depend only on the window, so nothing jumps as the panels fill.
- **The Sun is fixed in the scene** at today's real height over the equator and the globe turns under it on the real clock, north up. The view drifts once round in ten minutes until the player touches it.
- **Continents** are named on the globe, each above a small dot. **Show where I am** asks the browser for the player's location only when pressed; a yes puts a blue "You are here" dot on the globe and turns the view to it. The place stays in the page: it is never stored or sent.
- **Fly to a place** takes an address or coordinates (`40.7, -74.0`, `33.9°S 151.2°E`; `place.ts`, tested). Coordinates never leave the page; an address is looked up once per Go with OpenStreetMap Nominatim. The camera turns over the place and dives in 4 s (the height falls evenly in log terms) to 500 m up, north at the top, riding the turning Earth. Esri World Imagery tiles fade in on the way down: a 5x5 square at zoom 6, 9, 12, 15 and 18, coarse under fine, each shown in full once its square fills the view. **Back to space** climbs out in 2.5 s and hands the view back to the drag controls. A satellite picked while down there does not pull the camera away (the first pick lands whenever the satellites load); a storm does. Reduced motion jumps.
- **Picking** a satellite (the list, or a click on its dot) names it, draws its orbit and glides the view to it; a storm's button glides to the storm. The view leans toward the Sun (most for a low satellite, less for a storm or a high satellite, which must stay in the picture) so a thing over the night side is seen beside daylight, not on a black disc. A name near the right edge sits to the left of its dot.
- **Every item says where and when it is from.** A feed that fails says so in its own item and the rest carry on; with no connection the screen says "Live data needs a connection." and shows the bundled Earth.
- **The close-approach minutes count down** on the device clock, and the screening runs again once the pass it found is a minute behind.
- **Reduced motion:** no drift, no glide (the view jumps to what was picked), no fade.
- **A phone** (900 px wide or less): the globe takes the top half and everything else is one sheet that scrolls in the bottom half.
- **No WebGL:** the panels still work and say the globe cannot be drawn.

Measured in headless Chrome (Metal) on 2026-11-15 with other work running on the machine: 6 draw calls a frame and 16.6 ms a frame (the display's own rate, slowest frame 16.8 ms) at 1290x690 and at 390x844 at twice the pixels, with all 2,681 debris pieces shown, in the preview and from both entries in the game.

Checked in that browser, from pictures: the preview and both game entries at both sizes; each feed blocked in turn (the picture, all of CelesTrak, one satellite group, one debris group, NOAA, EONET, the satellite.js download), everything blocked, the browser offline, and a browser with no WebGL. During these checks CelesTrak's answers were the copies downloaded at 09:52 UTC, replayed to the page, to keep to its one download per two hours; NOAA, EONET and GIBS were asked for real. At 11:53 UTC, two hours after those downloads, the screen was run once with nothing replayed: all eight CelesTrak groups, NOAA, EONET and GIBS answered 200 with `Access-Control-Allow-Origin: *`, and a reload then asked for nothing.

## The data layer

Real feeds for the screen. The screen imports from `ui/live` (`index.ts`).

`docs/NASA_SOURCES.md` and `docs/CHALLENGE_OFFICIAL.md` name no live feed for these items. GIBS was already in the repo (`ui/probe/nasa.ts`); the rest are official open NASA and NOAA services, and CelesTrak for orbits.

## Feeds

Every feed was called from the shell and from a headless Chrome page on `http://localhost:5190` on 2026-11-15 between 09:52 and 10:12 UTC. All answered 200 with `Access-Control-Allow-Origin: *`. Trimmed real answers are in `fixtures/`.

| Item | URL | Owner | Terms | Refresh rule here | Accuracy limit |
|---|---|---|---|---|---|
| Earth picture | `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=VIIRS_NOAA20_CorrectedReflectance_TrueColor&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=2048&HEIGHT=1024&FORMAT=image/jpeg&TIME=<day>` | NASA GIBS (ESDIS); VIIRS on NOAA-20 | Free and open; NASA asks for a credit to GIBS / ESDIS | One download per pictured day, kept in Cache Storage (`live-earth-imagery`); GIBS itself answers `no-store` | 19.6 km per pixel at the equator. Each place is photographed near 13:25 local time, so clouds are 10 to 40 hours old. No data is pure black |
| Satellites | `https://celestrak.org/NORAD/elements/gp.php?GROUP=<stations\|science\|resource\|weather>&FORMAT=json` | CelesTrak (T.S. Kelso), from US Space Force tracking | Free, no account; CelesTrak asks for at most one download of a group per two hours | Two hours per group, timestamped in `localStorage`, kept across reloads | SGP4 on public elements: about 1 km when the elements are fresh, 1 to 3 km worse per day of age |
| Debris | same, `GROUP=<fengyun-1c-debris\|cosmos-2251-debris\|iridium-33-debris\|cosmos-1408-debris>` | CelesTrak | same | same | same; half the pieces had elements under 0.8 days old, 5 % over 6.7 days, the oldest 30 days |
| Kp | `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json` | NOAA Space Weather Prediction Center | US Government work, public domain; credit NOAA SWPC | Five minutes | NOAA's estimated planetary Kp for a three-hour window, from 8 stations. The final Kp is published later by GFZ Potsdam and can differ a little |
| Flare | `https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json` | NOAA SWPC, GOES X-ray sensor | same | Five minutes | One-minute X-ray data; the class is the peak of the most recent flare in the file |
| Place search | `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=<typed address>` | OpenStreetMap Foundation | ODbL; at most one request a second, credit OpenStreetMap | Once per Go; never for typed coordinates | The first hit only |
| Close-up pictures | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/<z>/<y>/<x>` | Esri World Imagery (Maxar, Earthstar Geographics) | Free to show with the credit; no key | 125 tiles per search, not stored | Months to years old, not live; 0.6 m a pixel at zoom 18. Remote places may show Esri's "no data" tile |
| Storms | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=severeStorms` | NASA EONET (Earth Observatory) | NASA open data; each event links its own source (JTWC, NHC and others) | Thirty minutes | The position is the storm's last advisory point. "Open" events can be days past it: both open storms on 2026-11-15 were last reported 3 and 4 days earlier. Show `at` |

What came back (shell, with `Origin: http://localhost:5190`):

| Feed | Status | Size | Content type | Notes |
|---|---|---|---|---|
| GIBS, NOAA-20, 2026-11-14, 2048x1024 | 200 | 558,865 B, 1.3 s | image/jpeg | 4096x2048: 2,025,233 B, 4.5 to 8.5 s |
| CelesTrak stations / science / resource / weather | 200 | 7,166 / 18,533 / 69,216 / 30,457 B (gzip on the wire: 5.9 to 13.5 kB) | application/json | 17 / 45 / 167 / 74 objects; all 14 curated satellites found |
| CelesTrak debris groups | 200 | 838,193 / 246,233 / 46,115 / 852 B (142 / 42 / 8 / 0.4 kB gzipped) | application/json | 1,989 / 581 / 109 / 2 objects, 2,681 in all |
| SWPC Kp | 200 | 4,563 B | application/json | `Cache-Control: max-age=60` |
| SWPC flare | 200 | 451 or 452 B | application/json | At 10:08 UTC the body ended in a NUL byte; `feed.ts` strips it |
| EONET | 200 | 8,748 B | application/rss+xml (the body is JSON) | 2 open storms |

Things the probe turned up that the code handles:

- CelesTrak catalogue numbers are past 99,999 (a Crew Dragon is 100882), so the old two-line format cannot carry them. The code uses the JSON (OMM) form.
- Only 2 Cosmos 1408 pieces are still tracked; the rest have re-entered. `clouds` reports each count as it is.
- Some operators publish elements dated ahead of now (Chandra's were a day ahead). None of the curated satellites did.
- GIBS answers 200 with an all-black JPEG for a day it has no data for, and 200 with XML for a bad layer. `looksLikeEarth` rejects both.

### Which picture, and why

One WMS request returns the whole globe as one equirectangular JPEG, longitude -180 at the left, the same layout as `ui/scene3d/maps/earth-day.jpg`.

- **Layer: `VIIRS_NOAA20_CorrectedReflectance_TrueColor`.** Its swath is wide enough that neighbouring orbits overlap at the equator, so there are no gaps. `MODIS_Terra` and `MODIS_Aqua` leave a black wedge between every pair of orbits from about 30°S to 30°N. `VIIRS_SNPP` was empty for 2026-11-13 and 2026-11-14. `VIIRS_NOAA21` looked as complete as NOAA-20 (560,732 B).
- **Day:** the UTC day that ended at least six hours ago (`latestFullDay`). At 09:53 UTC the day in progress covered only 110° of longitude.
- **Width 2048** by default: 0.56 MB and about a second. 4096 is 2.0 MB and five to eight seconds, for 9.8 km per pixel; pass `4096` to `fetchImagery` if the desktop globe wants it.
- **Polar night** is black: on 2026-11-14 everything north of about 61°N, ending in a ragged edge of whole passes between 57° and 62°N. In June it will be the south. The globe fades the picture out into the bundled map before that edge (where the midday Sun stood under about 14 to 21 degrees; `earthShader.ts`), so the edge is not seen. Sun glint shows as pale stripes in the tropics; that is in the data.
- **Filling the black from the bundled map:** in the 60°S to 60°N band of the real picture only 0.08 % of pixels had every channel at 6/255 or below, and 0.33 % at 12/255 or below. So `max(r, g, b) < 0.03` (blend with `smoothstep(0.02, 0.05, ...)`) marks no-data and almost nothing else. A server-side fill (adding `BlueMarble_ShadedRelief_Bathymetry` under the layer) does not work with JPEG: the answer was byte-identical.
- The picture already contains yesterday's real clouds. Do not draw the bundled cloud layer over it.

## Interface

```ts
import {
  fetchImagery, fetchSatellites, fetchDebris, fetchSpaceWeather, fetchStorms,
  loadOrbits, screenApproaches, altitudeBand, periodMinutes, epochIso,
  IMAGERY_SATELLITE_ID, OFFLINE, EARTH_RADIUS_KM, WINDOW_MINUTES, MAX_AGE_DAYS,
} from '../live'

type Feed<T> =
  | { ok: true; data: T; source: string; sourceUrl: string; asOf: string; fetchedAt: string }   // ISO UTC times
  | { ok: false; reason: string; source: string; sourceUrl: string }                           // show `reason` for that one item

fetchImagery(signal?, width?: 2048 | 4096): Promise<Feed<Imagery>>
fetchSatellites(signal?): Promise<Feed<Satellites>>
fetchDebris(signal?): Promise<Feed<Debris>>
fetchSpaceWeather(signal?): Promise<{ kp: Feed<KpNow>; flare: Feed<FlareNow> }>
fetchStorms(signal?): Promise<Feed<Storm[]>>
loadOrbits(elements: readonly Elements[]): Promise<Orbits | null>            // null: satellite.js could not be downloaded
screenApproaches(target: Tracked, targetIndex: number, others: Tracked, from: Date, signal?): Promise<Screening | null>

interface Imagery { day: string; layer: string; width: number; height: number; blob: Blob }
interface Satellites { list: Satellite[]; missing: string[] }                // list[0] is the ISS when it is there
interface Satellite { id: number; name: string; does: string; elements: Elements }
interface Debris { objects: Elements[]; clouds: { name: string; cause: string; count: number | null }[] }
interface KpNow { kp: number; g: 0 | 1 | 2 | 3 | 4 | 5; label: string; from: string }
interface FlareNow { flareClass: string; peakAt: string | null; nowClass: string; measuredAt: string } // peakAt null: still rising, flareClass is the level now
interface Storm { id: string; name: string; lat: number; lon: number; at: string; windKts: number | null; link: string }

interface Orbits extends Tracked {
  positions(at: Date, out: Float32Array): number              // xyz per object, returns how many were placed
  state(index: number, at: Date): SatState | null
  ring(index: number, at: Date, out: Float32Array): boolean   // one lap as out.length / 3 points
}
interface SatState { lat: number; lon: number; altKm: number; speedKmS: number; position: [number, number, number] }
interface Screening {
  closest: { name: string; id: number; index: number; distanceKm: number; at: string; inMinutes: number; elementsAgeDays: number } | null
  sharingAltitude: number; band: { lowKm: number; highKm: number }
  screened: number; tooOld: number; from: string; windowMinutes: number
}
```

`Elements` keeps the feed's own field names (`OBJECT_NAME`, `NORAD_CAT_ID`, `EPOCH`, `MEAN_MOTION`, ...). `altitudeBand(elements)`, `periodMinutes(elements)` and `epochIso(elements)` read the useful things off it.

Nothing here throws. A feed function resolves to `ok: false` with a sentence to show; `signal` only releases the caller, and the one request still finishes into the cache so a remount does not ask twice.

### Usage

```ts
const stop = new AbortController()
const [sats, debris] = await Promise.all([fetchSatellites(stop.signal), fetchDebris(stop.signal)])
if (sats.ok && debris.ok) {
  const satOrbits = await loadOrbits(sats.data.list.map((sat) => sat.elements))
  const debrisOrbits = await loadOrbits(debris.data.objects)
  if (satOrbits && debrisOrbits) {
    const points = new Float32Array(debris.data.objects.length * 3) // the Points position attribute's array
    debrisOrbits.positions(new Date(), points)                      // once a second, then needsUpdate
    const iss = satOrbits.state(0, new Date())                      // { lat, lon, altKm, speedKmS, position }
    const pass = await screenApproaches(satOrbits, 0, debrisOrbits, new Date(), stop.signal)
  }
}
```

The picture: `const url = URL.createObjectURL(imagery.data.blob)`, load it with `THREE.TextureLoader` exactly like the bundled map, then `URL.revokeObjectURL(url)`.

### What the screen needs to know

- **Frame.** `positions`, `state().position` and `ring` are in Earth radii in the bundled map's own Earth-fixed frame (longitude 0 on +X, north on +Y, east towards -Z, the frame `sunDirection` and `mapUv` use). Put the points in the same group as a radius-1 globe and they sit over the right ground; the ISS is at radius 1.066, GOES-19 at 6.6. For a storm marker use the same mapping: `[cos(lat) cos(lon), sin(lat), -cos(lat) sin(lon)]`.
- **How often.** Measured in Chrome on this machine: 14 satellites take 0.02 ms, so every frame is fine. 2,681 debris pieces take 1.5 ms, so update them **once a second** (a piece moves under half a pixel in that time). satellite.js allocates a small object per propagation; nothing else here allocates per call except `state`, which is for the one picked satellite a few times a second. Preparing all orbits takes about 25 ms once.
- **Unplaceable objects** are written at 0,0,0, inside the globe.
- **Ring.** It is the orbit as it stands in space at that moment, so it closes. Redraw it every ten seconds or so; the Earth turns under it.
- **Screening** takes up to 0.4 s for a satellite in the thick of the debris (NOAA-20, Landsat) and 30 ms for the ISS, in slices of 4 ms; the longest gap between frames while it ran was 17 to 21 ms. Run it when a satellite is picked, not on a timer.
- **Per-satellite time.** Show `epochIso(satellite.elements)` as that satellite's "as of"; the feed's `asOf` is the newest among them.
- **NOAA-20** (`IMAGERY_SATELLITE_ID`) took the picture on the globe. Worth one line when it is picked and the live picture is showing.
- **Offline.** Every feed answers `ok: false` with `OFFLINE` ("Live data needs a connection.") unless it has a recent copy: orbits stay usable for two days, the last picture until a newer day is fetched.

### Wording for the close-approach chip

On 2026-11-15 10:12 UTC the real answers were: ISS 117.5 km (a Cosmos 2251 piece, in 64 min), 11 pieces crossing its height; Hubble 61.5 km, 25; Landsat 8 46.3 km, 647; NOAA-20 11.0 km, 1,351; GOES-19 34,160 km, 0.

- Say "closest tracked piece in the next 100 minutes: 117 km, Cosmos 2251 debris, in 64 min" and "11 tracked pieces cross this height". Round distances to the kilometre.
- Say it is "a screening from public orbit data, good to a few kilometres, not an official collision warning". The positions are about 1 km off when the elements are fresh and several km off after a day or two (`elementsAgeDays` is there to show), so a 5 km result does not mean a 5 km miss. Elements older than 10 days are left out of the closest-pass search (`tooOld`, 66 pieces on the day) but still counted in the height band.
- When `sharingAltitude` is 0 (GOES-19, far above all of it) drop the distance and say no tracked piece from these four clouds reaches this height.
- Only these four debris clouds are screened, not the whole catalogue.

### Tying space weather to the game

Kp comes with NOAA's storm level: `g` 0 to 5 and a label (below storm level: under 3 "quiet", 3 "unsettled", 4 "active"). The flare class is shown with its size in NASA's plain words: A and B very small, C small, M medium, X large. The game's storm cards fire on real G3 or stronger days, which is Kp 7 or more: "A storm like the ones in your mission would read Kp 7 or more."

## Checked against the real world

- A second check by hand at 11:03 UTC, with no SGP4 library (a Kepler orbit with the J2 drift, from the same CelesTrak elements): the ISS at 15.59° S, 38.48° E, 417 km, 27,582 km/h against the screen's 15.6° S, 38.4° E, 419 km, 27,580 km/h; the closest debris pass for the ISS 117 km in 13.2 minutes from the same Cosmos 2251 piece (screen: 117 km in 13 min) and for NOAA-20 29 km in 44.0 minutes (screen: 29 km in 44 min). The Sun overhead point from an almanac formula was 18.5° S, 9.6° E against the screen's 19.2° S, 9.8° E, which puts the day and night line within about 80 km.
- The ISS position from these elements matched an independent tracker (wheretheiss.at) at the same second to 0.02° (35.831°, -149.825° against 35.841°, -149.842°), with the same height (422.3 km) and speed (27,583 km/h).
- GOES-19 comes out at 75.19°W over the equator, 35,789 km up; NOAA parks it at 75.2°W.
- The screening is tested on circular orbits whose closest pass is known exactly (1.5 km, between two coarse samples, found to 0.01 km and 5 ms), and against real SGP4 with a copy of the ISS 0.1° behind it.

## The one dependency

`satellite.js` 6.0.2 (MIT), imported with `import()` inside `loadOrbits`. In a trial build it became its own chunk, 24.1 kB (11.6 kB gzipped), next to a 14 kB chunk for this folder; the first load stayed 72.5 kB. **Stay on 6.x:** 7.x also ships a WebAssembly build with a worker and top-level await, and `vite build` fails on it (`Module format "iife" does not support top-level await`).

## Not done

- The screen never asks a feed again while it stays open (no fetch loop), so a screen left open for hours shows old values with their true "as of" times. Closing and reopening it refreshes whatever has passed its refresh rule.
- The night side is as dark as it really is, so a storm or a cloud system on it cannot be seen until the Sun reaches it.
- Storm names are not kept apart: two storms close together overlap their labels.
- A landscape phone gets the desktop layout only above 900 px; under that the globe has half the window's height.

- No check that a day's picture is complete beyond its file size; a day with one missing orbit would still be shown.
- The Cache Storage copy of the picture and the `localStorage` copies of the feeds are never cleared except by being replaced.
- A feed that cannot be reached is left alone for ten minutes in the same visit, and one whose answer could not be read for one minute; a reload asks again.
- Not seen: how `xray-flares-latest.json` looks while a flare is still rising. At 12:05 UTC on 2026-11-15, as a new flare was first listed, the screen could not read the file once; a minute later it could. The file writes `"Unk"` and `null` for the end of a flare that has not ended, so `parseFlare` takes the same for a peak not yet reached and shows the level now ("flare still rising at 12:00 UTC"). If the cause was a half-written file instead, the one-minute rule above covers it.
- Feed text is not trusted: a storm's name is cut to 60 characters, a wind of 250 knots or more is left out, a second event with the same id is dropped, and an orbit whose name is longer than 40 characters is dropped.
