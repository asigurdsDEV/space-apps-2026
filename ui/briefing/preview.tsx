// Dev-only preview: `npm run dev`, then open /ui/briefing/preview.html. Not part of the build.
// Uses the demo scenario's title + params from data/scenarios/demo.json (claude@jamie).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Briefing } from './Briefing'

const config = {
  title: 'First Light: your first Earth-observing CubeSat',
  duration_s: 31_536_000,
  params: {
    objective_text: 'Photograph Earth from orbit and send home enough data to earn 30 science points within one year, without going over budget.',
    budget_usd: 8_000_000,
    target_science_score: 30,
    mission_duration_s: 31_536_000,
    bonus_goal: 'no_data_lost',
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Briefing config={config} onStart={() => console.log('start designing')} onBack={() => console.log('back')} />
  </StrictMode>,
)
