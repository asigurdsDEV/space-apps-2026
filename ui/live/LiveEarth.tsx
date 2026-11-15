// Live Earth: the real planet right now. Yesterday's satellite picture on a globe lit by today's Sun, real satellites
// and tracked debris where they are this second, a close-approach screening, space weather and open storms.
// Every number comes from a feed in this folder (README.md) and says where and when it is from.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  distanceKm, fetchDebris, findPlace, fetchImagery, parseCoords, fetchSatellites, fetchSpaceWeather, fetchStorms, IMAGERY_SATELLITE_ID, epochIso, loadOrbits, screenApproaches, tripTime,
  WINDOW_MINUTES, type Debris, type Place, type Feed, type FlareNow, type Imagery, type KpNow, type Orbits, type Satellites, type Screening, type Storm,
} from './index'
import { createLiveScene, type Layer, type LiveScene } from './scene'
import { approachText, count, dayText, flareText, kpText, placeText, timeText, whenText } from './text'
import './live.css'

/** A CelesTrak feed and, once satellite.js has it, the orbits. `orbits: null` means positions could not be worked out. */
interface Tracked<T> { feed: Feed<T>; orbits: Orbits | null }

const NO_ORBITS = 'Positions unavailable: the orbit calculator could not be downloaded.'
const LAYERS: Layer[] = ['satellites', 'debris', 'storms']

export default function LiveEarth({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const free = useRef<HTMLDivElement>(null)
  const scene = useRef<LiveScene | null>(null)
  const title = useId()

  const [noGlobe, setNoGlobe] = useState(false)
  const [imagery, setImagery] = useState<{ feed: Feed<Imagery>; shown: boolean } | null>(null)
  const [sats, setSats] = useState<Tracked<Satellites> | null>(null)
  const [debris, setDebris] = useState<Tracked<Debris> | null>(null)
  const [weather, setWeather] = useState<{ kp: Feed<KpNow>; flare: Feed<FlareNow> } | null>(null)
  const [storms, setStorms] = useState<Feed<Storm[]> | null>(null)
  const [picked, setPicked] = useState(0)
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ satellites: true, debris: true, storms: true })
  const [clock, setClock] = useState(() => Date.now())
  // The player's place: asked for only when they press the button, kept in this page, never sent anywhere.
  const [here, setHere] = useState<{ lat: number; lon: number } | 'asking' | 'no' | null>(null)
  const findMe = () => {
    if (!('geolocation' in navigator)) return setHere('no')
    setHere('asking')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setHere({ lat: coords.latitude, lon: coords.longitude })
        scene.current?.setHere(coords.latitude, coords.longitude)
      },
      () => setHere('no'),
      { maximumAge: 600_000, timeout: 20_000 },
    )
  }
  // The search box: typed coordinates stay in the page; an address goes to OpenStreetMap once, when Go is pressed.
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Place | 'looking' | string | null>(null)
  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || found === 'looking') return
    setFound('looking')
    const place = await findPlace(query)
    setFound(place)
    if (typeof place === 'object') scene.current?.flyTo(place.lat, place.lon, place.name)
  }
  const backToSpace = () => {
    scene.current?.flyOut()
    setFound(null)
  }
  /** null while it runs; false when the satellite itself could not be followed. */
  const [screening, setScreening] = useState<Screening | false | null>(null)
  const [screenings, setScreenings] = useState(0)

  useEffect(() => {
    const el = dialog.current!
    if (!el.open) el.showModal()
    // Capture, and before any menu under this screen sees it: Esc closes this screen only.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      el.close()
    }
    addEventListener('keydown', onKey, true)
    const tick = setInterval(() => setClock(Date.now()), 1000)

    const stop = new AbortController()
    const alive = () => !stop.signal.aborted
    let made: LiveScene | null = null
    try {
      made = createLiveScene(stage.current!, { free: free.current!, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, onPick: setPicked })
    } catch {
      setNoGlobe(true)
    }
    scene.current = made
    void fetchImagery(stop.signal).then(async (feed) => {
      const shown = feed.ok && made && alive() ? await made.setImagery(feed.data.blob) : false
      if (alive()) setImagery({ feed, shown })
    })
    void fetchSatellites(stop.signal).then(async (feed) => {
      const orbits = feed.ok && alive() ? await loadOrbits(feed.data.list.map((sat) => sat.elements)) : null
      if (!alive()) return
      if (orbits) made?.setSatellites(orbits)
      setSats({ feed, orbits })
    })
    void fetchDebris(stop.signal).then(async (feed) => {
      const orbits = feed.ok && alive() ? await loadOrbits(feed.data.objects) : null
      if (!alive()) return
      if (orbits) made?.setDebris(orbits)
      setDebris({ feed, orbits })
    })
    void fetchSpaceWeather(stop.signal).then((feed) => alive() && setWeather(feed))
    void fetchStorms(stop.signal).then((feed) => {
      if (!alive()) return
      if (feed.ok) made?.setStorms(feed.data)
      setStorms(feed)
    })
    return () => {
      stop.abort()
      clearInterval(tick)
      removeEventListener('keydown', onKey, true)
      made?.dispose()
      scene.current = null
    }
  }, [])

  const list = sats?.feed.ok ? sats.feed.data.list : []
  const sat = list[picked]
  const satOrbits = sats?.orbits ?? null
  const debrisOrbits = debris?.orbits ?? null

  useEffect(() => {
    if (satOrbits && sat) scene.current?.pick(picked, sat.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, satOrbits])
  useEffect(() => {
    for (const layer of LAYERS) scene.current?.show(layer, layers[layer])
  }, [layers])
  // Run when a satellite is picked, and again only once the pass it found is a minute behind us: up to 0.4 s of work in small slices (README.md).
  useEffect(() => {
    if (screening && screening.closest && Date.parse(screening.closest.at) < clock - 60_000) setScreenings((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock])
  useEffect(() => {
    setScreening(null)
    if (!satOrbits || !debrisOrbits) return
    const stop = new AbortController()
    void screenApproaches(satOrbits, picked, debrisOrbits, new Date(), stop.signal).then((found) => {
      if (!stop.signal.aborted) setScreening(found ?? false)
    })
    return () => stop.abort()
  }, [picked, satOrbits, debrisOrbits, screenings])

  const state = useMemo(() => (satOrbits && sat ? satOrbits.state(picked, new Date(clock)) : null), [satOrbits, sat, picked, clock])
  // The list for screen readers changes twice a minute, not every second.
  const halfMinute = Math.floor(clock / 30_000)
  const everySatellite = useMemo(
    () => (satOrbits ? list.map((each, i) => ({ name: each.name, state: satOrbits.state(i, new Date()) })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [satOrbits, halfMinute],
  )

  const pieces = debris?.feed.ok ? debris.feed.data.objects.length : null
  const clouds = debris?.feed.ok ? debris.feed.data.clouds.filter((cloud) => cloud.count !== null) : []
  const counts: Record<Layer, number | null> = { satellites: satOrbits ? list.length : null, debris: debrisOrbits ? pieces : null, storms: storms?.ok ? storms.data.length : null }
  const approach = screening ? approachText(screening, clock) : null

  return createPortal(
    <dialog ref={dialog} className="game-theme le" data-theme="dark" aria-labelledby={title} onClose={onClose}>
      <div ref={stage} className="le-stage" role="img" aria-label="A globe of the Earth, lit by the Sun as it stands right now. The list at the end of this screen says what is on it." />
      <div ref={free} className="le-free" />
      <button type="button" className="game-button le-back" onClick={() => dialog.current?.close()}>Back</button>
      <div className="le-sheet">
        <section className="le-panel le-side">
          <p className="game-eyebrow">Live Earth · {timeText(clock)}</p>
          <h1 id={title}>The Earth right now</h1>
          <p className="le-note">
            {noGlobe ? 'This device cannot draw the 3D globe. The live data is still here.'
              : !imagery ? 'Loading the latest satellite picture…'
              : imagery.feed.ok && imagery.shown ? `Clouds photographed ${dayText(imagery.feed.asOf)} by VIIRS on NOAA-20 (NASA GIBS). Sunlight is as of now.`
              : `${imagery.feed.ok ? 'The picture could not be shown.' : imagery.feed.reason} Showing the bundled map, without today’s clouds.`}
          </p>
          <div className="le-toggles" role="group" aria-label="Show on the globe">
            {LAYERS.map((layer) => (
              <button key={layer} type="button" className="game-button" aria-pressed={layers[layer]} disabled={counts[layer] === null}
                title={layer === 'debris' && clouds.length ? `Tracked pieces: ${clouds.map((cloud) => `${cloud.name} ${count(cloud.count!)}`).join(', ')}` : undefined}
                onClick={() => setLayers({ ...layers, [layer]: !layers[layer] })}>
                <span>{layer}</span>
                <strong className="game-stat">{counts[layer] === null ? '–' : count(counts[layer])}</strong>
              </button>
            ))}
          </div>

          <div className="le-item">
            <h2 className="game-eyebrow">Where you are</h2>
            {here && typeof here === 'object' ? (
              <p>You are at {placeText(here.lat, here.lon)}, marked in blue. It stays on this device.</p>
            ) : (
              <>
                <button type="button" className="game-button" onClick={findMe} disabled={here === 'asking'}>{here === 'asking' ? 'Finding you…' : 'Show where I am'}</button>
                <p className="le-source">{here === 'no' ? 'Location not shared, so nothing is marked.' : 'Your browser asks first. Your location stays on this device.'}</p>
              </>
            )}
          </div>

          <div className="le-item">
            <h2 className="game-eyebrow">Fly to a place</h2>
            <form className="le-search" onSubmit={search}>
              <input className="game-field" type="search" aria-label="Address or coordinates" placeholder="Address, or 40.7, -74.0" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button type="submit" className="game-button" disabled={found === 'looking' || noGlobe}>{found === 'looking' ? 'Finding…' : 'Go'}</button>
            </form>
            {found && typeof found === 'object' ? (
              <>
                <p>Over {found.name} ({placeText(found.lat, found.lon)}).</p>
                {sat && state && (() => {
                  // Straight-line distance from the picked satellite now, and how long that is at its own speed.
                  const km = distanceKm(state, found)
                  return (
                    <dl className="le-stats">
                      <div><dt>From {sat.name}</dt><dd className="game-stat">{count(km)} km</dd></div>
                      <div><dt>At its {count(Math.round(state.speedKmS * 360) * 10)} km/h</dt><dd className="game-stat">{tripTime(km / state.speedKmS)}</dd></div>
                    </dl>
                  )
                })()}
                <button type="button" className="game-button" onClick={backToSpace}>Back to space</button>
                <p className="le-source">Close-up pictures: Esri World Imagery (Maxar, Earthstar Geographics), not taken today.{parseCoords(query) ? '' : ' Address found by OpenStreetMap Nominatim.'}</p>
              </>
            ) : (
              <p className="le-source">{typeof found === 'string' && found !== 'looking' ? found : 'Coordinates stay on this device. An address is sent once to OpenStreetMap to find it.'}</p>
            )}
          </div>

          <div className="le-item">
            <h2 className="game-eyebrow">Satellite</h2>
            {!sats ? <p className="game-muted">Finding the satellites…</p>
              : !sats.feed.ok ? <p className="game-muted">Satellites unavailable. {sats.feed.reason}</p>
              : !satOrbits || !sat ? <p className="game-muted">{NO_ORBITS}</p>
              : (
                <>
                  <select className="game-field" aria-label="Satellite" value={picked} onChange={(e) => setPicked(Number(e.target.value))}>
                    {list.map((each, i) => <option key={each.id} value={i}>{each.name}</option>)}
                  </select>
                  {state ? (
                    <dl className="le-stats">
                      <div><dt>Height</dt><dd className="game-stat">{count(state.altKm)} km</dd></div>
                      <div><dt>Speed</dt><dd className="game-stat">{count(Math.round(state.speedKmS * 360) * 10)} km/h</dd></div>
                      <div><dt>Over</dt><dd className="game-stat">{placeText(state.lat, state.lon)}</dd></div>
                    </dl>
                  ) : <p className="game-muted">Its position cannot be worked out from today’s orbit data.</p>}
                  <p>{sat.does}{sat.id === IMAGERY_SATELLITE_ID && imagery?.shown ? ' It took the picture on this globe.' : ''}</p>
                  <p className="le-source">CelesTrak · orbit measured {whenText(epochIso(sat.elements))}{sats.feed.data.missing.length ? ` · unavailable now: ${sats.feed.data.missing.join(', ')}` : ''}</p>
                </>
              )}
          </div>

          <div className="le-item">
            <h2 className="game-eyebrow">Closest debris, next {WINDOW_MINUTES} min</h2>
            {!sats || !debris ? <p className="game-muted">Checking…</p>
              : !debris.feed.ok ? <p className="game-muted">Debris data unavailable. {debris.feed.reason}</p>
              : !sats.feed.ok ? <p className="game-muted">Needs the satellites, which are unavailable.</p>
              : !satOrbits || !debrisOrbits ? <p className="game-muted">{NO_ORBITS}</p>
              : screening === null ? <p className="game-muted">Checking {count(pieces!)} pieces…</p>
              : !approach ? <p className="game-muted">This satellite’s path cannot be worked out from today’s orbit data.</p>
              : (
                <>
                  <p className="le-big game-stat">{approach.headline} <span>{approach.when}</span></p>
                  <p>{approach.detail}</p>
                  <p className="le-source">Screened against four debris clouds with public orbit data, good to a few kilometres. Not an official collision warning. CelesTrak · newest orbit {whenText(debris.feed.asOf)}</p>
                </>
              )}
          </div>
        </section>

        <section className="le-panel le-now">
          <div className="le-item">
            <h2 className="game-eyebrow">Space weather now</h2>
            <dl className="le-stats">
              <div>
                <dt>Kp index (0 to 9)</dt>
                <dd className="game-stat">{!weather ? '…' : weather.kp.ok ? kpText(weather.kp.data) : 'unavailable'}</dd>
              </div>
              <div>
                <dt>Latest solar flare</dt>
                <dd className="game-stat">{!weather ? '…' : weather.flare.ok ? flareText(weather.flare.data.flareClass) : 'unavailable'}</dd>
              </div>
            </dl>
            <p>A storm like the ones in your mission would read Kp 7 or more.</p>
            {weather && (
              <p className="le-source">
                NOAA SWPC · {[...new Set([
                  weather.kp.ok ? `Kp for the 3 hours from ${timeText(weather.kp.asOf)}` : weather.kp.reason,
                  weather.flare.ok ? (weather.flare.data.peakAt ? `flare peaked ${whenText(weather.flare.data.peakAt)}` : `flare still rising at ${timeText(weather.flare.data.measuredAt)}`) : weather.flare.reason,
                ])].join(' · ')}
              </p>
            )}
          </div>
          <div className="le-item">
            <h2 className="game-eyebrow">Open storms</h2>
            {!storms ? <p className="game-muted">Checking…</p>
              : !storms.ok ? <p className="game-muted">Storms unavailable. {storms.reason}</p>
              : storms.data.length === 0 ? <p className="game-muted">No severe storm is open right now. NASA EONET.</p>
              : (
                <>
                  <div className="le-storms">
                    {storms.data.map((storm) => (
                      <button key={storm.id} type="button" className="game-button" onClick={() => scene.current?.lookAt(storm.lat, storm.lon)}>
                        <span>{storm.name}</span>
                        <small>last report {dayText(storm.at)}{storm.windKts === null ? '' : ` · ${count(storm.windKts * 1.852)} km/h winds`}</small>
                      </button>
                    ))}
                  </div>
                  <p className="le-source">NASA EONET · marked where each was last reported</p>
                </>
              )}
          </div>
        </section>

        <section className="le-list" aria-label="What is on the globe">
          <ul>
            {everySatellite.map(({ name, state: at }) => <li key={name}>{name}: {at ? `${count(at.altKm)} km above ${placeText(at.lat, at.lon)}` : 'position unknown'}.</li>)}
            {storms?.ok && storms.data.map((storm) => <li key={storm.id}>{storm.name}: last reported at {placeText(storm.lat, storm.lon)} on {dayText(storm.at)}.</li>)}
            {here && typeof here === 'object' && <li>You: {placeText(here.lat, here.lon)}.</li>}
            {found && typeof found === 'object' && <li>Searched: {found.name}, {placeText(found.lat, found.lon)}.</li>}
            <li>Continents named on the globe: North America, South America, Europe, Africa, Asia, Australia, Antarctica.</li>
            {clouds.map((cloud) => <li key={cloud.name}>{count(cloud.count!)} tracked pieces of {cloud.name} debris. {cloud.cause}</li>)}
          </ul>
        </section>
      </div>
    </dialog>,
    document.body,
  )
}
