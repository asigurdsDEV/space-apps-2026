import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../theme/theme.css'
import ProbeExplorer from './ProbeExplorer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="game-theme" data-theme="dark">
      <ProbeExplorer onClose={() => history.back()} />
    </div>
  </StrictMode>,
)
