import { useId, useState, type FormEvent } from 'react'
import type { Config } from '../../shared'
import type { Difficulty } from '../../data'
import { Term } from '../learn'
import '../learn/learn.css'
import { startRequest, type StartMode, type StartRequest } from './model'
import './start.css'

export type StartScenario = Pick<Config, 'scenario_id' | 'title' | 'params'>

export interface StartScreenProps {
  scenarios: readonly StartScenario[]
  scenarioPreview?: (id: string, difficulty: Difficulty) => StartScenario | undefined
  difficultyLabels?: Record<Difficulty, string>
  onStart: (request: StartRequest) => void
  busy?: boolean
  error?: string | null
}
const modes: { mode: StartMode; title: string; detail: string }[] = [
  { mode: 'solo', title: 'Play solo', detail: 'Your mission. Every engineering decision.' },
  { mode: 'host', title: 'Host online', detail: 'Create a room for up to four teammates.' },
  { mode: 'join', title: 'Join a room', detail: 'Bring a room code from your host.' },
]

export function StartScreen({ scenarios, onStart, scenarioPreview, difficultyLabels = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }, busy = false, error }: StartScreenProps) {
  const id = useId()
  const [mode, setMode] = useState<StartMode>('solo')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [name, setName] = useState('')
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.scenario_id ?? '')
  const [code, setCode] = useState('')
  const [validation, setValidation] = useState<string | null>(null)
  const scenario = scenarios.find(item => item.scenario_id === scenarioId) ?? scenarios[0]
  const preview = scenario && (scenarioPreview ? scenarioPreview(scenario.scenario_id, difficulty) : difficulty === 'normal' ? scenario : undefined)
  const budget = preview?.params.budget_usd
  const goal = preview?.params.target_science_score
  const message = validation || error
  function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const request = startRequest(mode, name, scenario?.scenario_id ?? '', code, difficulty)
    if (!request) { setValidation('Enter your name and choose a scenario, or enter a room code to join.'); return }
    setValidation(null)
    onStart(request)
  }
  return (
    <main className="ss-root">
      <div className="ss-layout">
        <header className="ss-intro">
          <p className="ss-eyebrow">Kimchi Trenchers · Space Mission Design Game</p>
          <h1>Big ideas.<br /><span>Finite resources.</span></h1>
          <p className="ss-lede">Design a spacecraft, balance its resources, and discover what it takes to bring science home.</p>
          <p className="ss-hint">Learn the trade-offs in your <Term id="power-budget" /> and <Term id="downlink" />.</p>
          <ol className="ss-steps"><li>Choose your mission</li><li>Make the trade-offs</li><li>Fly and learn</li></ol>
        </header>
        <form className="ss-panel" onSubmit={submit} onChange={() => setValidation(null)} aria-busy={busy}>
          <fieldset disabled={busy}>
            <legend>How will you play?</legend>
            <div className="ss-modes" role="group" aria-label="Play mode">
              {modes.map(item => (
                <button key={item.mode} type="button" className="ss-mode" aria-pressed={mode === item.mode}
                  onClick={() => { setMode(item.mode); setValidation(null) }}>
                  <strong>{item.title}</strong><span>{item.detail}</span>
                </button>
              ))}
            </div>
            <label htmlFor={`${id}-name`}>Your name</label>
            <input id={`${id}-name`} value={name} onChange={event => setName(event.target.value)}
              required maxLength={40} autoComplete="nickname" placeholder="Mission planner" />
            {mode === 'join' ? <>
              <label htmlFor={`${id}-code`}>Room code</label>
              <input id={`${id}-code`} value={code} onChange={event => setCode(event.target.value)}
                required autoCapitalize="none" autoCorrect="off" spellCheck={false}
                aria-describedby={`${id}-hint`} placeholder="Paste the full code" />
              <p id={`${id}-hint`} className="ss-hint">Your host chooses the scenario. Room codes are case-sensitive.</p>
            </> : <>
              <label htmlFor={`${id}-scenario`}>Mission scenario</label>
              <select id={`${id}-scenario`} value={scenario?.scenario_id ?? ''} required
                onChange={event => setScenarioId(event.target.value)} disabled={!scenarios.length}>
                {!scenarios.length && <option value="">No scenarios available</option>}
                {scenarios.map(item => <option key={item.scenario_id} value={item.scenario_id}>{item.title}</option>)}
              </select>
              <label htmlFor={`${id}-difficulty`}>Difficulty</label>
              <select id={`${id}-difficulty`} value={difficulty} onChange={event => setDifficulty(event.target.value as Difficulty)}>
                {(['easy', 'normal', 'hard'] as const).map(level => <option key={level} value={level}>{difficultyLabels[level]}</option>)}
              </select>
              <dl className="ss-stats" aria-live="polite">
                {typeof budget === 'number' && Number.isFinite(budget) && <div><dt>Budget</dt><dd>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(budget)}</dd></div>}
                {typeof goal === 'number' && Number.isFinite(goal) && <div><dt>Science goal</dt><dd>{goal} points</dd></div>}
              </dl>
              {!preview && <p className="ss-hint">Adjusted budget and goal will appear in the mission briefing.</p>}
              <p className="ss-hint">{typeof scenario?.params.objective_text === 'string' ? scenario.params.objective_text : 'Choose a mission, then read the briefing before you build.'}</p>
            </>}
            {message && <p className="ss-error" role="alert">{message}</p>}
            <button className="ss-primary" type="submit" disabled={busy || (mode !== 'join' && !scenario)}>
              {busy ? 'Connecting…' : mode === 'solo' ? 'Start mission' : mode === 'host' ? 'Create room' : 'Join room'}
            </button>
            <p className="ss-hint">Solo play works on one device. Online play needs a connection; use solo if the venue network blocks it.</p>
          </fieldset>
        </form>
      </div>
    </main>
  )
}
