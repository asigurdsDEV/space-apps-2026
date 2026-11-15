// The small moving diagram beside each start step. Decoration only (aria-hidden): every fact it
// shows is also in the step's own text. start.css draws and animates it; reduced motion holds it still.
import type { StartMode } from './model'

export type Step = 'menu' | 'setup' | 'mission' | 'difficulty'

const CONSOLES = ['PLAN', 'SPACECRAFT', 'SCIENCE', 'COMMS'] // the four GO / NO-GO consoles (ui/gonogo)
const PLAN = [
  ['Design', 'Choose a rocket, orbit, spacecraft and instruments within budget.'],
  ['Launch', 'Your consoles call GO or NO-GO, then the rocket flies.'],
  ['Science', 'Send data home and reach the science goal.'],
]
const TARGET: Record<string, string> = { moon: 'MOON', mars: 'MARS' }

export interface DiagramProps {
  step: Step
  mode: StartMode
  scenarioId: string
  /** Budget and science goal at the picked level, as a share of the largest level's (0–1). */
  bars: { label: string; value: string; share: number }[]
}

export function Diagram({ step, mode, scenarioId, bars }: DiagramProps) {
  return (
    <div className="ss-diagram" aria-hidden="true" key={step}>
      {step === 'menu' && <>
        <p>Mission plan</p>
        <ol className="ss-plan">
          {PLAN.map(([title, detail], i) => <li key={title} style={{ animationDelay: `${0.5 + i * 0.25}s` }}>
            <small>0{i + 1}</small><strong>{title}</strong><span>{detail}</span>
          </li>)}
          <i className="ss-plan-dot" />
        </ol>
      </>}
      {step === 'setup' && <>
        <p>{mode === 'solo' ? 'You run all 4 consoles' : 'One console per player'}</p>
        <svg viewBox="0 0 300 120">
          {CONSOLES.map((name, i) => {
            const x = 45 + i * 70
            return <g key={name} className="ss-pulse" style={{ animationDelay: `${i * 0.35}s` }}>
              <path className="ss-draw" d={`M150 22L${x} 70`} />
              <rect x={x - 28} y="70" width="56" height="26" rx="3" /><text x={x} y="112" textAnchor="middle">{name}</text>
            </g>
          })}
          <circle className="ss-hub" cx="150" cy="18" r="10" />
        </svg>
      </>}
      {step === 'mission' && <>
        <p>{TARGET[scenarioId] ? `Earth → ${TARGET[scenarioId] === 'MOON' ? 'Moon' : 'Mars'}` : 'Earth orbit'}</p>
        <svg viewBox="0 0 300 120">
          <circle className="ss-hub" cx="50" cy="80" r="16" /><text x="50" y="114" textAnchor="middle">EARTH</text>
          {TARGET[scenarioId] ? <>
            <path id="ss-trip" className="ss-draw ss-dash" d="M50 80Q150 -30 250 50" />
            <circle className={`ss-target ss-target-${scenarioId}`} cx="250" cy="50" r="11" /><text x="250" y="80" textAnchor="middle">{TARGET[scenarioId]}</text>
            <circle className="ss-dot" r="4"><animateMotion dur="4s" repeatCount="indefinite" path="M50 80Q150 -30 250 50" /></circle>
          </> : <>
            <ellipse className="ss-draw ss-dash" cx="50" cy="80" rx="38" ry="30" />
            <circle className="ss-dot" r="4"><animateMotion dur="4s" repeatCount="indefinite" path="M12 80a38 30 0 1 0 76 0a38 30 0 1 0 -76 0" /></circle>
            <path className="ss-draw ss-dash" d="M88 70L250 40" /><text x="250" y="60" textAnchor="middle">SCIENCE DATA</text>
          </>}
        </svg>
      </>}
      {step === 'difficulty' && <>
        <p>This level</p>
        {bars.map(bar => <div className="ss-bar" key={bar.label}>
          <span>{bar.label}</span><b>{bar.value}</b>
          <i><i style={{ width: `${Math.round(bar.share * 100)}%` }} /></i>
        </div>)}
      </>}
    </div>
  )
}
