import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Config } from '../../shared'
import { PROGRAM, type Difficulty } from '../../data'
import { SpaceView } from '../scene3d'
import { Diagram, type Step } from './Diagram'
import { readName, rememberName } from './name'
import '../learn/learn.css'
import type { DailyMission, DailyMissionRequest } from './daily'
import { startRequest, type StartMode, type StartRequest } from './model'
import './start.css'

/** `entities` is optional: with it, the 3D background shows the mission's own planet and spacecraft. */
export type StartScenario = Pick<Config, 'scenario_id' | 'title' | 'params'> & Partial<Pick<Config, 'entities'>>

export interface StartScreenProps {
  scenarios: readonly StartScenario[]
  scenarioPreview?: (id: string, difficulty: Difficulty) => StartScenario | undefined
  difficultyLabels?: Record<Difficulty, string>
  dailyMission?: DailyMission | null
  onDailyMission?: (request: DailyMissionRequest) => void
  onStart: (request: StartRequest) => void
  busy?: boolean
  error?: string | null
  /** The step shown first. Default "menu"; previews and tests open a later one. */
  initialStep?: Step
  /** Shown under the menu step only, on the same space background (the app's one-screen strip). */
  children?: ReactNode
}
const modes: { mode: StartMode; title: string; detail: string }[] = [
  { mode: 'solo', title: 'Play solo', detail: '1 player' },
  { mode: 'host', title: 'Host online', detail: 'Up to 4 crew' },
  { mode: 'join', title: 'Join a room', detail: 'Have a code?' },
]
const LEVELS = ['easy', 'normal', 'hard'] as const
const STEPS: Step[] = ['menu', 'setup', 'mission', 'difficulty']
const HEADINGS: Record<Step, string> = { menu: 'GO / NO-GO', setup: 'Mission setup', mission: 'Choose your mission', difficulty: 'Choose difficulty' }
const FADE_MS = 700 // each way; matches .ss-stage's transition in start.css
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
/** A positive number, else undefined (the sandbox has no budget or goal to show). */
const amount = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined)

export function StartScreen({ scenarios, onStart, scenarioPreview, dailyMission, onDailyMission, difficultyLabels = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }, busy = false, error, initialStep = 'menu', children }: StartScreenProps) {
  const id = useId()
  const [step, setStep] = useState<Step>(initialStep)
  const [fading, setFading] = useState(false)
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
  const heading = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)
  const scenario = scenarios.find(item => item.scenario_id === scenarioId) ?? ordered[0]
  const at = (item: StartScenario, level: Difficulty) => (scenarioPreview ? scenarioPreview(item.scenario_id, level) : level === 'normal' ? item : undefined)
  const preview = scenario && at(scenario, difficulty)
  const budget = amount(preview?.params.budget_usd)
  const goal = amount(preview?.params.target_science_score)
  const dailyScenario = dailyMission && scenarios.find(item => item.scenario_id === dailyMission.scenarioId)
  const message = validation || error
  const joining = mode === 'join'

  // Fade the old step out, swap, fade the new one in. The 3D background keeps turning behind.
  function go(next: Step) {
    if (fading || next === step) return
    setValidation(null)
    moved.current = true
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setStep(next); return }
    setFading(true)
    setTimeout(() => { setStep(next); setFading(false) }, FADE_MS)
  }
  // Keyboard and screen-reader users land on the new step's heading (not on first load).
  useEffect(() => { if (moved.current) heading.current?.focus() }, [step])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || fading) return
    if (step === 'setup' && !joining) { go('mission'); return }
    if (step !== 'difficulty' && !(step === 'setup' && joining)) return
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

  // Bars for the difficulty diagram: this level against the most generous level.
  const share = (key: 'budget_usd' | 'target_science_score', value: number | undefined) => {
    const most = Math.max(...LEVELS.map(level => amount(scenario && at(scenario, level)?.params[key]) ?? 0))
    return value && most ? value / most : 0
  }
  const bars = [
    ...(budget === undefined ? [] : [{ label: 'Budget', value: usd.format(budget), share: share('budget_usd', budget) }]),
    ...(goal === undefined ? [] : [{ label: 'Science goal', value: `${goal} points`, share: share('target_science_score', goal) }]),
  ]
  const stepNumber = STEPS.indexOf(step)

  return (
    <main className="ss-root">
      {scenario?.entities && <SpaceView className="ss-bg" state={{ entities: scenario.entities, params: scenario.params }} mode="orbit" showCaption={false} backdrop />}
      {/* Inter Tight, a free stand-in for Ferrari Sans; without the network the system sans is used. React hoists it into <head>. */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500&display=swap" precedence="default" />
      <div className="ss-masthead"><span className="ss-brand"><span aria-hidden="true">✦</span> GO / NO-GO</span><span>Space Mission Design Game</span><span className="ss-edition">NASA Space Apps · 2026</span></div>
      <form id="mission-setup" className={`ss-stage${fading ? ' is-fading' : ''}`} onSubmit={submit} onChange={() => setValidation(null)} aria-busy={busy}>
        <div className="ss-side">
          {step === 'menu' && <header className="ss-intro">
            <p className="ss-eyebrow">Kimchi Trenchers · Mission control</p>
            <h1 ref={heading} tabIndex={-1}>{HEADINGS.menu}</h1>
            <p className="ss-lede">Design · Launch · Bring the science home</p>
          </header>}
          <Diagram step={step} mode={mode} scenarioId={scenario?.scenario_id ?? ''} bars={bars} />
        </div>
        <fieldset className="ss-panel" disabled={busy || fading}>
          {step !== 'menu' && <>
            <p className="ss-panel-kicker">Step {stepNumber} of {joining ? 1 : 3}</p>
            <h1 className="ss-step-title" ref={heading} tabIndex={-1}>{HEADINGS[step]}</h1>
          </>}

          {step === 'menu' && <>
            <button className="ss-primary" type="button" onClick={() => go('setup')}>Start</button>
            {dailyMission && dailyScenario && onDailyMission && <section className="ss-daily" aria-labelledby={`${id}-daily`}>
              <h2 id={`${id}-daily`}><span aria-hidden="true">✦</span> Daily mission</h2>
              <p className="ss-hint"><time dateTime={dailyMission.date}>{dailyMission.date}</time> (UTC) · {dailyScenario.title}</p>
              <button className="ss-daily-button" type="button" onClick={playDaily}>Play daily mission</button>
            </section>}
          </>}

          {step === 'setup' && <>
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
            {joining && <>
              <label htmlFor={`${id}-code`}>Room code</label>
              <input id={`${id}-code`} value={code} onChange={event => setCode(event.target.value)}
                required autoCapitalize="none" autoCorrect="off" spellCheck={false}
                aria-describedby={`${id}-hint`} placeholder="Paste the full code" />
              <p id={`${id}-hint`} className="ss-hint">Codes are case-sensitive.</p>
            </>}
          </>}

          {step === 'mission' && <div className="ss-program" role="group" aria-label="Mission program">
            {!scenarios.length && <p className="ss-hint">No scenarios available.</p>}
            {ordered.map((item, index) => {
              const [title, ...rest] = item.title.split(':')
              const normal = at(item, 'normal')
              const cost = amount(normal?.params.budget_usd)
              const target = amount(normal?.params.target_science_score)
              return <button type="button" key={item.scenario_id} data-scenario={item.scenario_id} aria-pressed={scenario?.scenario_id === item.scenario_id}
                onClick={() => { setScenarioId(item.scenario_id); go('difficulty') }}>
                <span className={`ss-world ss-world-${item.scenario_id}`} aria-hidden="true" />
                <span><small>0{index + 1}</small><strong>{title}</strong>{rest.length > 0 && <em>{rest.join(':').trim()}</em>}</span>
                <span className="ss-chips">{cost !== undefined && <span>{usd.format(cost)}</span>}{target !== undefined && <span>{target} points</span>}</span>
              </button>
            })}
          </div>}

          {step === 'difficulty' && <>
            <div className="ss-modes" role="group" aria-label="Difficulty">
              {LEVELS.map(level => <button key={level} type="button" className="ss-mode" aria-pressed={difficulty === level} onClick={() => setDifficulty(level)}>
                <strong>{difficultyLabels[level]}</strong>
              </button>)}
            </div>
            <dl className="ss-stats" aria-live="polite">
              {budget !== undefined && <div><dt>Budget</dt><dd>{usd.format(budget)}</dd></div>}
              {goal !== undefined && <div><dt>Science goal</dt><dd>{goal} points</dd></div>}
            </dl>
            <p className="ss-hint">{typeof scenario?.params.objective_text === 'string' ? scenario.params.objective_text : 'Read the briefing before you build.'}</p>
          </>}

          {message && <p className="ss-error" role="alert">{message}</p>}
          {step !== 'menu' && <div className="ss-nav">
            <button className="ss-back" type="button" onClick={() => go(STEPS[stepNumber - 1]!)}>Back</button>
            {step === 'setup' && <button className="ss-primary" type="submit">{joining ? (busy ? 'Connecting…' : 'Join room') : 'Next'}</button>}
            {step === 'difficulty' && <button className="ss-primary" type="submit" disabled={!scenario}>{busy ? 'Connecting…' : mode === 'host' ? 'Create room' : 'Start mission'}</button>}
          </div>}
        </fieldset>
      </form>
      {step === 'menu' && children && <div className={`ss-footer${fading ? ' is-fading' : ''}`}>{children}</div>}
    </main>
  )
}
