// Preview: npm run dev, then /ui/story/preview.html. Steps through the story beats of one mission.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { SimEvent, Summary } from '../../shared'
import '../theme/theme.css'
import { CapcomPopout, Cutscene, FactPopout, TaskPanel } from './Story'
import { LINES, storyBeat, type StoryScreen } from './model'

const at = { tick: 1, t_s: 1 }
const STEPS: { screen: StoryScreen; events: SimEvent[] }[] = [
  { screen: 'briefing', events: [] },
  { screen: 'design', events: [] },
  { screen: 'poll', events: [] },
  { screen: 'flight', events: [{ type: 'phase_changed', ...at, payload: { from: 'design', to: 'cruise' } }] },
  { screen: 'flight', events: [{ type: 'phase_changed', ...at, payload: { from: 'cruise', to: 'operations' } }] },
  { screen: 'flight', events: [{ type: 'decision_required', ...at, payload: { decision_id: 'd1', card_id: 'c', title: '', body: '', console: 'spacecraft', options: [] } }] },
  { screen: 'flight', events: [{ type: 'scenario_ended', ...at, payload: { reason: 'success', summary: { outcome: 'success' } as Summary } }] },
  { screen: 'results', events: [{ type: 'scenario_ended', ...at, payload: { reason: 'success', summary: { outcome: 'success' } as Summary } }] },
]

function Preview() {
  const [i, setI] = useState(0)
  const [scenario, setScenario] = useState('demo')
  const [seen, setSeen] = useState<string[]>([])
  const [fact, setFact] = useState(false)
  const step = STEPS[i]!
  const beat = storyBeat(step.screen, step.events, scenario)
  const playing = beat.cutscene && !seen.includes(beat.key)
  return (
    <div className="game-theme" data-theme="dark" style={{ minHeight: '100vh', background: 'var(--game-bg)', color: 'var(--game-text)', padding: 16, fontFamily: 'var(--game-font)' }}>
      <h1>Story pop-outs</h1>
      <p>
        Step {i + 1} of {STEPS.length}: <strong>{step.screen}</strong> → beat <code>{beat.key}</code>
      </p>
      <p>
        <button onClick={() => setI((n) => Math.max(0, n - 1))}>◂ Back</button> <button onClick={() => setI((n) => Math.min(STEPS.length - 1, n + 1))}>Next station ▸</button>{' '}
        <select value={scenario} onChange={(e) => setScenario(e.target.value)} aria-label="Scenario">
          <option value="demo">First Light (Earth)</option>
          <option value="moon">Moon Mapper</option>
          <option value="mars">Red Planet Radar</option>
        </select>{' '}
        <button onClick={() => setSeen([])}>Replay cutscenes</button> <button onClick={() => setFact(true)}>Show a fact</button>
      </p>
      <TaskPanel label="Station task">
        <div style={{ padding: 24, minHeight: 240 }}>The station's screen (builder, poll, mission…) pops out here.</div>
      </TaskPanel>
      {fact && <FactPopout termId="delta-v" onClose={() => setFact(false)} />}
      {playing ? (
        <Cutscene id={beat.cutscene!} caption={LINES[beat.line]} onDone={() => setSeen((s) => [...s, beat.key])} />
      ) : (
        <CapcomPopout line={beat.line} />
      )}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
