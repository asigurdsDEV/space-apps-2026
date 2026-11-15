// Dev-only preview: `npm run dev`, then open /ui/audio/preview.html. Not part of the build.
// The launch is heard on its own preview page (/ui/scene3d/launch/preview.html), where the 3D scene drives it.
// For measuring without ears: `await __render({ place: 'launch', vehicle: 'electron' })` in the console renders a scene offline.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../theme/theme.css'
import { launchTimeline } from '../scene3d/launch/timeline'
import { rocketSpec } from '../scene3d/launch/vehicles'
import { SOUNDS, SoundToggle, playSound, type SoundName } from '.'
import { caution, enter } from './ambience'
import { buildPlace, output } from './engine'
import { DETAILS, detailGap, launchScore, type Place } from './places'

interface Scene { place: Place; vehicle?: string; failed?: boolean; seconds?: number; alarmAt?: number }

/** Renders a scene with the game's own graph in an OfflineAudioContext. Returns mono float samples as base64. */
async function render({ place, vehicle = 'falcon-9', failed = false, seconds = 30, alarmAt }: Scene) {
  const spec = rocketSpec({ id: vehicle, name: vehicle, props: {} })
  const timeline = launchTimeline(spec, { failed })
  const length = place === 'launch' ? timeline.duration + 1.5 : seconds
  const ctx = new OfflineAudioContext(1, Math.ceil(length * 48000), 48000)
  const sound = buildPlace(ctx, output(ctx), place, launchScore(spec, timeline))
  let seed = 7
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) | 0) >>> 8) / 16777216
  const events: { t: number; name: string }[] = []
  if (place === 'launch') {
    sound.out.gain.setTargetAtTime(1, 0, 0.03)
    for (let t = 0; t <= timeline.duration; t += 1 / 60) sound.frame(t, t)
  } else {
    sound.out.gain.setTargetAtTime(1, 0, 0.3)
    for (let t = detailGap(rand()); t < length; t += detailGap(rand())) {
      const list = DETAILS[place]
      const name = list[Math.floor(rand() * list.length)]!
      events.push({ t, name })
      let at = t
      for (let n = name === 'tap' ? 3 + Math.floor(rand() * 4) : 1; n > 0; n--, at += 0.09 + 0.16 * rand()) sound.cue(name, at, rand)
    }
    if (alarmAt !== undefined) sound.cue('caution', alarmAt)
  }
  const bytes = new Uint8Array((await ctx.startRendering()).getChannelData(0).buffer)
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return { sampleRate: 48000, stages: place === 'launch' ? timeline.stages.map(({ id, start, end }) => ({ id, start, end })) : [], events, pcm: btoa(text) }
}
Object.assign(window, { __render: render })

function Preview() {
  const [leave, setLeave] = useState<{ place: string; stop: () => void } | null>(null)
  const go = (place: 'control' | 'cabin' | null) => {
    leave?.stop()
    setLeave(place && { place, stop: enter(place) })
  }
  return (
    <main className="game-theme" style={{ minHeight: '100vh', padding: 24, display: 'grid', gap: 16, alignContent: 'start' }}>
      <h1>Sounds</h1>
      <SoundToggle />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(SOUNDS) as SoundName[]).map((name) => (
          <button key={name} type="button" className="game-button" onClick={() => playSound(name)}>
            {name}
          </button>
        ))}
      </div>
      <h2>Places: {leave?.place ?? 'none'}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="game-button" onClick={() => go('control')}>Mission control</button>
        <button type="button" className="game-button" onClick={() => go('cabin')}>Spacecraft room</button>
        <button type="button" className="game-button" onClick={caution}>Alarm (in the spacecraft room)</button>
        <button type="button" className="game-button" onClick={() => go(null)}>Leave</button>
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
