import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../theme/theme.css'
import LiveEarth from './LiveEarth'

function Preview() {
  const [open, setOpen] = useState(!location.search.includes('closed')) // ?closed: start shut, to open it by hand (offline checks)
  return (
    <div className="game-theme" data-theme="dark" style={{ minHeight: '100dvh', padding: 16 }}>
      <button type="button" className="game-button" onClick={() => setOpen(true)}>Live Earth</button>
      {open && <LiveEarth onClose={() => setOpen(false)} />}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
