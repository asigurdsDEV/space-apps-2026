import { StrictMode, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PilotInput } from './index'
import type { PilotIntent } from './index'
import '../theme/theme.css'

function Preview() {
  const [interactions, setInteractions] = useState(0)
  const [paused, setPaused] = useState(false)
  const [mounted, setMounted] = useState(true)
  const [light, setLight] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const lastIntent = useRef<PilotIntent | null>(null)
  return <main className="game-theme" data-theme={light ? 'light' : 'dark'} style={{ minHeight: '100vh', padding: '1rem' }}>
    <h1>Flight input preview</h1>
    <p>Input only. Spacecraft movement is connected separately by the scene owner.</p>
    <div className="pi-footer" style={{ marginBottom: '1rem', justifyContent: 'start' }}>
      <button className="game-button" onClick={() => setPaused(!paused)}>{paused ? 'Resume' : 'Pause'}</button>
      <button className="game-button" onClick={() => setMounted(!mounted)}>{mounted ? 'Unmount' : 'Mount'} controls</button>
      <button className="game-button" onClick={() => setLight(!light)}>Switch theme</button>
    </div>
    {mounted && <PilotInput disabled={paused} onIntent={value => {
      lastIntent.current = value
      setHistory(previous => [...previous.slice(-5), JSON.stringify(value)])
    }} onInteract={() => setInteractions(count => count + 1)} />}
    <p role="status">Interactions: {interactions}</p>
    {!mounted && <p>Last intent at unmount: <output>{JSON.stringify(lastIntent.current)}</output></p>}
    <label>Outside controls: <input className="game-field" placeholder="WASD types here normally" /></label>
    <details><summary>Recent input events</summary><ol>{history.map((entry, index) => <li key={index}><code>{entry}</code></li>)}</ol></details>
  </main>
}

const root = createRoot(document.getElementById('root')!)
root.render(<StrictMode><Preview /></StrictMode>)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
