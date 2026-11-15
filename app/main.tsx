import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '../ui/theme/theme.css'
import { GameAssets } from './GameAssets'

const App = lazy(() => import('./App').then((m) => ({ default: m.App })))
const GAME_NAME = document.title

// The tab shows the game's name and a small spacecraft-in-orbit icon. Set here because
// index.html belongs to the scaffold; an inline SVG needs no file under the Pages base path.
document.title = GAME_NAME
const icon = document.createElement('link')
icon.rel = 'icon'
icon.href =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><title>${GAME_NAME}</title>` +
      '<rect width="32" height="32" rx="7" fill="#0b1020"/><circle cx="16" cy="16" r="6" fill="#5b8cff"/>' +
      '<ellipse cx="16" cy="16" rx="13" ry="5.5" fill="none" stroke="#edf1fa" stroke-width="1.6" transform="rotate(-28 16 16)"/>' +
      '<circle cx="26.5" cy="9.5" r="2.4" fill="#ffda8a"/></svg>',
  )
document.head.append(icon)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameAssets><Suspense fallback={<main className="game-theme ga-page" role="status">Opening mission control…</main>}><App /></Suspense></GameAssets>
  </StrictMode>,
)
