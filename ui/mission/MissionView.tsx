// Mission run view: what the player watches after pressing Launch.
// Reads SimState + events, sends only Commands (CONTRACTS.md ground rule 1).

import type { Command, SimEvent, SimState } from '../../shared'
import { Bar } from './Bar'
import { DecisionCard } from './DecisionCard'
import { eventWhen, logLines } from './eventText'
import {
  formatDate,
  formatGb,
  formatPoints,
  formatUsd,
  num,
  PHASES,
  phaseLabel,
  str,
} from './format'
import { STORM_LABEL, type Decision, type SpaceWeather } from './game'
import { OrbitDiagram } from './OrbitDiagram'

/** Speed buttons. The multiplier goes straight into `set_speed`; the app decides what 1x means. */
export const SPEEDS = [1, 5, 20, 60] as const

export interface MissionViewProps {
  state: SimState
  /** Events so far, oldest first. The app keeps this list; the view shows the newest 50. */
  events: readonly SimEvent[]
  /** Called for every button press. The app routes pause/resume/set_speed/reset itself and passes the rest to the sim. */
  onCommand: (command: Command) => void
  /** App-side pause flag. Falls back to `state.status === 'paused'`. */
  paused?: boolean
  /** Current speed multiplier, to highlight the active button. */
  speed?: number
  /** Scenario title from Config.title. */
  title?: string
  /** The open anomaly card, if any (from the latest unresolved `decision_required` event). */
  decision?: Decision | null
  /** Sends `resolve_decision`. Required for the card's buttons to do anything. */
  onDecide?: (decisionId: string, optionId: string) => void
  /** Co-op: false when another player's console owns the open card. */
  canDecide?: boolean
  /** Today's real space weather for this mission day (data/space-weather). Hidden when absent. */
  spaceWeather?: SpaceWeather | null
}

export function MissionView({
  state,
  events,
  onCommand,
  paused,
  speed = 1,
  title,
  decision,
  onDecide,
  canDecide,
  spaceWeather,
}: MissionViewProps) {
  const m = state.metrics
  const phase = str(m, 'phase', 'design')
  const isPaused = paused ?? state.status === 'paused'
  const ended = state.status === 'ended'
  // Time stands still while a card is open, so the run controls do nothing until it's answered.
  const locked = ended || !!decision

  const missionDays = num(m, 'mission_days')
  const missionDay = num(m, 'mission_day')
  const cruiseDays = num(m, 'cruise_days')
  const orbit = state.entities.find((e) => e.kind === 'orbit' && e.id === state.params.orbit)
  const targetAltitudeKm = typeof orbit?.props.altitude_km === 'number' ? orbit.props.altitude_km : undefined

  const scienceGoal = num(m, 'science_goal')
  const science = num(m, 'science_score')
  const budget = num(m, 'budget_usd')
  const spent = num(m, 'cost_spent_usd')
  const storage = num(m, 'storage_gb')
  const stored = num(m, 'data_stored_gb')
  const generated = num(m, 'data_generated_gb')
  const downlinked = num(m, 'data_downlinked_gb')
  const lost = num(m, 'data_lost_gb')

  const send = (command: Command) => () => onCommand(command)
  const lines = logLines(events)

  return (
    <section className="mv" aria-label="Mission run">
      <header className="mv-head">
        <div>
          <h2 className="mv-title">{title ?? 'Mission'}</h2>
          <p className="mv-muted">
            {formatDate(state.utc)}
            {phase === 'operations' && missionDays > 0 && ` · Day ${Math.floor(missionDay)} of ${Math.round(missionDays)}`}
            {phase === 'cruise' && cruiseDays > 0 && ` · Reaching orbit (${Math.round(cruiseDays)} day trip)`}
          </p>
        </div>
        <ol className="mv-phases" aria-label="Mission phases">
          {PHASES.map((p) => {
            const index = PHASES.indexOf(p)
            const current = PHASES.indexOf(phase as (typeof PHASES)[number])
            const status = index < current ? 'done' : index === current ? 'current' : 'todo'
            return (
              <li key={p} className={`mv-phase mv-phase--${status}`} aria-current={status === 'current' ? 'step' : undefined}>
                {phaseLabel(p)}
              </li>
            )
          })}
        </ol>
      </header>

      <div className="mv-controls" role="toolbar" aria-label="Simulation controls">
        {isPaused ? (
          <button type="button" onClick={send({ type: 'resume', payload: {} })} disabled={locked}>
            ▶ Resume
          </button>
        ) : (
          <button type="button" onClick={send({ type: 'pause', payload: {} })} disabled={locked}>
            ❚❚ Pause
          </button>
        )}
        <div className="mv-speeds" role="group" aria-label="Speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={speed === s}
              className={speed === s ? 'is-active' : undefined}
              onClick={send({ type: 'set_speed', payload: { multiplier: s } })}
              disabled={locked}
            >
              {s}×
            </button>
          ))}
        </div>
        <button type="button" className="mv-reset" onClick={send({ type: 'reset', payload: {} })}>
          ↺ Start over
        </button>
      </div>

      {decision && (
        <DecisionCard
          decision={decision}
          onDecide={onDecide ?? (() => {})}
          when={phase === 'operations' && missionDay > 0 ? `Day ${Math.floor(missionDay)}` : eventWhen(state.t_s)}
          canAnswer={canDecide ?? !!onDecide}
        />
      )}

      {spaceWeather && (
        <p
          className={`mv-weather mv-tone-${spaceWeather.storm_g >= 3 ? 'bad' : spaceWeather.storm_g >= 1 ? 'warn' : 'good'}`}
          aria-live="polite"
        >
          <strong>☀ Space weather: {STORM_LABEL[spaceWeather.storm_g] ?? STORM_LABEL[0]}</strong>
          <span>Kp {spaceWeather.kp_max.toFixed(1)}</span>
          <span>{Math.round(spaceWeather.sunspots)} sunspots</span>
          <span>Solar flux {Math.round(spaceWeather.f107_sfu)}</span>
          <span className="mv-muted">Real NASA data from {formatDate(spaceWeather.date)}</span>
        </p>
      )}

      <div className="mv-body">
        <OrbitDiagram entities={state.entities} targetAltitudeKm={targetAltitudeKm} />

        <div className="mv-panels">
          <div className="mv-card">
            <h3>Progress</h3>
            <Bar
              label="Science returned"
              value={science}
              max={scienceGoal}
              tone={scienceGoal > 0 && science >= scienceGoal ? 'good' : 'info'}
              detail={scienceGoal > 0 ? `${formatPoints(science)} / ${formatPoints(scienceGoal)} pts` : `${formatPoints(science)} pts`}
            />
            <Bar
              label="Mission time"
              value={missionDay}
              max={missionDays}
              detail={missionDays > 0 ? `${Math.floor(missionDay)} / ${Math.round(missionDays)} days` : '—'}
            />
            <Bar
              label="Money spent"
              value={spent}
              max={budget}
              tone={budget > 0 && spent > budget ? 'bad' : 'info'}
              detail={budget > 0 ? `${formatUsd(spent)} / ${formatUsd(budget)}` : formatUsd(spent)}
            />
          </div>

          <div className="mv-card">
            <h3>Data</h3>
            <Bar
              label="On-board storage"
              value={stored}
              max={storage}
              tone={storage > 0 && stored >= storage * 0.95 ? 'warn' : 'info'}
              detail={storage > 0 ? `${formatGb(stored)} / ${formatGb(storage)}` : formatGb(stored)}
            />
            <dl className="mv-stats">
              <div>
                <dt>Collected</dt>
                <dd>{formatGb(generated)}</dd>
              </div>
              <div>
                <dt>Sent home</dt>
                <dd>{formatGb(downlinked)}</dd>
              </div>
              <div className={lost > 0 ? 'mv-tone-warn' : undefined}>
                <dt>Lost</dt>
                <dd>{formatGb(lost)}</dd>
              </div>
            </dl>
            <p className="mv-muted mv-small">Science only counts once its data reaches the ground.</p>
          </div>
        </div>
      </div>

      <div className="mv-card mv-log">
        <h3>Mission log</h3>
        {lines.length === 0 ? (
          <p className="mv-muted">Nothing yet.</p>
        ) : (
          <ol aria-live="polite">
            {lines.map((line) => (
              <li key={line.key} className={`mv-tone-${line.tone}`}>
                <span className="mv-log__when">{line.when}</span>
                <span>{line.text}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
