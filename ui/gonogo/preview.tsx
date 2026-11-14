// Dev-only preview: `npm run dev`, then open /ui/gonogo/preview.html. Not part of the build.
// Issue messages are copied from the real sim's wording for the demo scenario.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Issue } from '../../shared'
import { GoNoGoPoll } from './GoNoGoPoll'
import '../theme/theme.css' // shared theme (ui/theme/, codex@aiden)

const CASES: Record<string, Issue[]> = {
  'Clean design': [],
  'Starting demo (concerns)': [
    { code: 'downlink_short', severity: 'warning', resource: 'comms', message: 'You make 21.6 GB of data a day but the radio can only send 0.4 GB home. Pick a faster radio or fewer instruments.' },
    { code: 'science_short', severity: 'warning', resource: 'design', message: 'This design should earn about 2 science points, but the goal is 30. Add instruments or send more data home.' },
  ],
  'Over budget + wrong orbit (blocked)': [
    { code: 'orbit_unreachable', severity: 'error', resource: 'mass', message: 'Rideshare slot cannot reach Geostationary orbit. Pick a bigger launch vehicle or a closer orbit.' },
    { code: 'over_budget', severity: 'error', resource: 'budget', message: 'The mission costs $72.3M but the budget is $8M. Pick cheaper parts or a cheaper launch.' },
    { code: 'battery_small', severity: 'warning', resource: 'power', message: 'The battery can’t run everything through each eclipse. Instruments will switch off in shadow.' },
  ],
}

function Preview() {
  const [name, setName] = useState(Object.keys(CASES)[1])
  const [log, setLog] = useState('')
  return (
    <main className="game-theme" style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
      <p>
        {Object.keys(CASES).map((n) => (
          <button key={n} type="button" className="game-button" style={{ marginRight: 8 }} onClick={() => { setName(n); setLog('') }}>
            {n}
          </button>
        ))}
      </p>
      <GoNoGoPoll key={name} issues={CASES[name]} onLaunch={() => setLog('launch sent')} onBack={() => setLog('back to design')} />
      <p aria-live="polite">{log}</p>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
