import { useId, useState, type FormEvent } from 'react'
import type { Config } from '../../shared'
import { PROGRAM, type Difficulty } from '../../data'
import { MissionArt } from './MissionArt'
import { readName, rememberName } from './name'
import '../learn/learn.css'
import type { DailyMission, DailyMissionRequest } from './daily'
import { startRequest, type StartMode, type StartRequest } from './model'
import './start.css'

export type StartScenario = Pick<Config, 'scenario_id' | 'title' | 'params'>

export interface StartScreenProps {
  scenarios: readonly StartScenario[]
  scenarioPreview?: (id: string, difficulty: Difficulty) => StartScenario | undefined
  difficultyLabels?: Record<Difficulty, string>
  dailyMission?: DailyMission | null
  onDailyMission?: (request: DailyMissionRequest) => void
  onStart: (request: StartRequest) => void
  busy?: boolean
  error?: string | null
}
const modes: { mode: StartMode; title: string; detail: string }[] = [
  { mode: 'solo', title: 'Play solo', detail: '1 player' },
  { mode: 'host', title: 'Host online', detail: 'Up to 4 crew' },
  { mode: 'join', title: 'Join a room', detail: 'Have a code?' },
]

export function StartScreen({ scenarios, onStart, scenarioPreview, dailyMission, onDailyMission, difficultyLabels = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }, busy = false, error }: StartScreenProps) {
  const id = useId()
  const [mode, setMode] = useState<StartMode>('solo')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [name, setName] = useState(readName)
  const ordered = [...scenarios].sort((a, b) => {
    const rank = (id: string) => { const index = PROGRAM.indexOf(id); return index < 0 ? PROGRAM.length : index }
    return rank(a.scenario_id) - rank(b.scenario_id)
  })
  const [scenarioId, setScenarioId] = useState(ordered[0]?.scenario_id ?? '')
  const [code, setCode] = useState('')
  const [validation, setValidation] = useState<string | null>(null)
  const scenario = scenarios.find(item => item.scenario_id === scenarioId) ?? ordered[0]
  const preview = scenario && (scenarioPreview ? scenarioPreview(scenario.scenario_id, difficulty) : difficulty === 'normal' ? scenario : undefined)
  const budget = preview?.params.budget_usd
  const goal = preview?.params.target_science_score
  const dailyScenario = dailyMission && scenarios.find(item => item.scenario_id === dailyMission.scenarioId)
  const message = validation || error
  function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const request = startRequest(mode, name, scenario?.scenario_id ?? '', code, difficulty)
    if (!request) { setValidation('Choose a mission or enter a room code, and keep your name under 41 characters.'); return }
    setValidation(null)
    rememberName(request.name); setName(request.name)
    onStart(request)
  }
  function playDaily() {
    if (busy || !dailyMission || !onDailyMission || !dailyScenario) return
    const request = startRequest('solo', name, dailyMission.scenarioId, '', 'normal')
    if (!request) { setValidation('Keep your name under 41 characters to play the daily mission.'); return }
    setValidation(null)
    rememberName(request.name); setName(request.name)
    onDailyMission({ ...dailyMission, name: request.name })
  }
  return (
    <main className="ss-root">
      <div className="ss-masthead"><span className="ss-brand"><span aria-hidden="true">✦</span> GO / NO-GO</span><span>Space Mission Design Game</span><span className="ss-edition">NASA Space Apps · 2026</span></div>
      <div className="ss-layout">
        <header className="ss-intro">
          <p className="ss-eyebrow">Kimchi Trenchers · Mission control</p>
          <h1>GO / NO-GO</h1>
          <p className="ss-lede">Design · Launch · Bring the science home</p>
          <MissionArt scenarioId={scenario?.scenario_id ?? ''} />
          <div className="ss-program-heading"><h2>Choose your destination</h2></div>
          <div className="ss-program" role="group" aria-label="Mission program">
            {ordered.map((item, index) => <button type="button" key={item.scenario_id} aria-pressed={scenario?.scenario_id === item.scenario_id} disabled={busy || mode === 'join'} onClick={() => setScenarioId(item.scenario_id)}>
              <span className={`ss-world ss-world-${item.scenario_id}`} aria-hidden="true" /><span><small>0{index + 1}</small><strong>{item.title.split(':')[0]}</strong></span>
            </button>)}
          </div>
        </header>
        <form id="mission-setup" className="ss-panel" onSubmit={submit} onChange={() => setValidation(null)} aria-busy={busy}>
          <fieldset disabled={busy}>
            <legend>Mission setup</legend>
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
              maxLength={40} autoComplete="nickname" placeholder="Mission planner" />
            {mode === 'join' ? <>
              <label htmlFor={`${id}-code`}>Room code</label>
              <input id={`${id}-code`} value={code} onChange={event => setCode(event.target.value)}
                required autoCapitalize="none" autoCorrect="off" spellCheck={false}
                aria-describedby={`${id}-hint`} placeholder="Paste the full code" />
              <p id={`${id}-hint`} className="ss-hint">Codes are case-sensitive.</p>
            </> : <>
              <label htmlFor={`${id}-scenario`}>Mission scenario</label>
              <select id={`${id}-scenario`} value={scenario?.scenario_id ?? ''} required
                onChange={event => setScenarioId(event.target.value)} disabled={!scenarios.length}>
                {!scenarios.length && <option value="">No scenarios available</option>}
                {ordered.map(item => <option key={item.scenario_id} value={item.scenario_id}>{item.title}</option>)}
              </select>
              <label htmlFor={`${id}-difficulty`}>Difficulty</label>
              <select id={`${id}-difficulty`} value={difficulty} onChange={event => setDifficulty(event.target.value as Difficulty)}>
                {(['easy', 'normal', 'hard'] as const).map(level => <option key={level} value={level}>{difficultyLabels[level]}</option>)}
              </select>
              <dl className="ss-stats" aria-live="polite">
                {typeof budget === 'number' && Number.isFinite(budget) && <div><dt>Budget</dt><dd>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(budget)}</dd></div>}
                {typeof goal === 'number' && Number.isFinite(goal) && <div><dt>Science goal</dt><dd>{goal} points</dd></div>}
              </dl>
              <p className="ss-hint">{typeof scenario?.params.objective_text === 'string' ? scenario.params.objective_text : 'Choose a mission, then read the briefing before you build.'}</p>
            </>}
            {message && <p className="ss-error" role="alert">{message}</p>}
            <button className="ss-primary" type="submit" disabled={busy || (mode !== 'join' && !scenario)}>
              {busy ? 'Connecting…' : mode === 'solo' ? 'Start mission' : mode === 'host' ? 'Create room' : 'Join room'}
            </button>
            {mode === 'solo' && dailyMission && dailyScenario && onDailyMission && <section className="ss-daily" aria-labelledby={`${id}-daily`}>
              <h2 id={`${id}-daily`}><span aria-hidden="true">✦</span> Daily mission</h2>
              <p className="ss-hint"><time dateTime={dailyMission.date}>{dailyMission.date}</time> (UTC) · {dailyScenario.title}</p>
              <button className="ss-daily-button" type="button" onClick={playDaily} disabled={busy}>Play daily mission</button>
            </section>}
          </fieldset>
        </form>
      </div>
    </main>
  )
}
