import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { WalkTouchControls } from './WalkTouchControls'
import type { WalkVector } from './walk-touch'
import '../theme/theme.css'

function Preview() {
  const [move, setMove] = useState<WalkVector>([0, 0])
  const [look, setLook] = useState<WalkVector>([0, 0])
  const [uses, setUses] = useState(0)
  const [disabled, setDisabled] = useState(false)
  const [mounted, setMounted] = useState(true)
  return <main className="game-theme" style={{ minHeight: '100vh', padding: '.75rem', boxSizing: 'border-box' }}>
    <h1>Walking touch preview</h1>
    <p>Input only; the first-person controller moves the camera.</p>
    <p><button className="game-button" onClick={() => setDisabled(!disabled)}>{disabled ? 'Resume' : 'Pause'}</button>{' '}
      <button className="game-button" onClick={() => setMounted(!mounted)}>{mounted ? 'Unmount' : 'Mount'}</button></p>
    <p><output data-move>Move {JSON.stringify(move)}</output></p>
    <p><output data-look>Last look delta {JSON.stringify(look)}</output></p>
    <p><output data-uses>Interactions {uses}</output></p>
    {mounted && <WalkTouchControls disabled={disabled} onMove={setMove} onLook={setLook} onInteract={() => setUses(n => n + 1)} />}
  </main>
}
const root = createRoot(document.getElementById('root')!)
root.render(<StrictMode><Preview /></StrictMode>)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
