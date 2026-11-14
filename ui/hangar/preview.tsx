// Preview: npm run dev, then /ui/hangar/preview.html. Walk the hall with the buttons, Enter/arrows, or by tapping a station.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getDatasets, getScenario } from '../../data'
import { catalogEntities } from '../../sim'
import '../theme/theme.css'
import { Hangar, type StationId } from './index'

const config = getScenario('demo')!
const state = { entities: catalogEntities(getDatasets(config.datasets)), params: config.params }

function Preview() {
  const [station, setStation] = useState<StationId>('wall')
  const [arrived, setArrived] = useState<string>('wall')
  return (
    <div className="game-theme" data-theme="dark" style={{ minHeight: '100vh', background: 'var(--game-bg)', color: 'var(--game-text)', padding: 16, fontFamily: 'var(--game-font)' }}>
      <h1 style={{ marginTop: 0 }}>Mission control</h1>
      <Hangar station={station} onSelect={setStation} onArrive={setArrived} state={state} title={config.title} className="hg-preview" />
      <p>
        Going to <code>{station}</code>, last arrived at <code id="arrived">{arrived}</code>.
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
