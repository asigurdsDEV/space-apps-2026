// Dev-only preview: `npm run dev`, then open /ui/audio/preview.html. Not part of the build.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../theme/theme.css'
import { SOUNDS, SoundToggle, playSound, type SoundName } from '.'

function Preview() {
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
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
