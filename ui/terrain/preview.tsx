import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../theme/theme.css'
import LunarExplorer from './LunarExplorer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="game-theme" data-theme="dark">
      <LunarExplorer onClose={() => history.back()} />
    </div>
  </StrictMode>,
)
