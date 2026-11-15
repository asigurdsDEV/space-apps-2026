// Mission run view: what the player watches after pressing Launch. A HUD over the 3D scene:
// a slim top bar, three gauges, the newest event as a toast, and the full log folded away.
// Reads SimState + events, sends only Commands (CONTRACTS.md ground rule 1).

import type { Command, SimEvent, SimState } from '../../shared'
import { SpaceView } from '../scene3d'
import { DecisionCard } from './DecisionCard'
import { eventWhen, logLines } from './eventText'
import { fillShare, formatDate, formatGb, formatPoints, formatUsd, num, PHASES, phaseLabel, str } from './format'
import { STORM_LABEL, type Decision, type SpaceWeather } from './game'

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
  /** Scenario title from Config.title (the app header already shows it, so it's only used for labels). */
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
  const scienceGoal = num(m, 'science_goal')
  const science = num(m, 'science_score')
  const budget = num(m, 'budget_usd')
  const spent = num(m, 'cost_spent_usd')
  const storage = num(m, 'storage_gb')
  const stored = num(m, 'data_stored_gb')
  const lost = num(m, 'data_lost_gb')

  const send = (command: Command) => () => onCommand(command)
  const lines = logLines(events)
  const latest = lines[0]
  const current = PHASES.indexOf(phase as (typeof PHASES)[number])
  const storm = spaceWeather ? spaceWeather.storm_g : 0
  const day = phase === 'operations' && missionDays > 0 ? `Day ${Math.floor(missionDay)} / ${Math.round(missionDays)}` : phaseLabel(phase)

  return (
    <section className="mv mv-hud" aria-label={title ? `Mission run: ${title}` : 'Mission run'}>
      <div className="mv-stage">
        <SpaceView state={state} mode="orbit" className="mv-space" showCaption={false} />

        <div className="mv-top">
          <ol className="mv-phases" aria-label="Mission phases">
            {PHASES.map((p, index) => {
              const status = index < current ? 'done' : index === current ? 'current' : 'todo'
              return (
                <li key={p} className={`mv-phase mv-phase--${status}`} aria-current={status === 'current' ? 'step' : undefined} title={phaseLabel(p)}>
                  <span className="mv-phase__label">{phaseLabel(p)}</span>
                </li>
              )
            })}
          </ol>
          <span className="mv-day">{day}</span>

          <div className="mv-controls" role="toolbar" aria-label="Simulation controls">
            {isPaused ? (
              <button type="button" className="mv-icon" onClick={send({ type: 'resume', payload: {} })} disabled={locked}>
                ▶ Resume
              </button>
            ) : (
              <button type="button" className="mv-icon" onClick={send({ type: 'pause', payload: {} })} disabled={locked}>
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
            <button type="button" className="mv-icon" aria-label="Start over" title="Start over" onClick={send({ type: 'reset', payload: {} })}>
              ↺
            </button>
          </div>
        </div>

        {spaceWeather && (
          <p
            className={`mv-weather mv-tone-${storm >= 3 ? 'bad' : storm >= 1 ? 'warn' : 'good'}`}
            title={`Kp ${spaceWeather.kp_max.toFixed(1)} · ${Math.round(spaceWeather.sunspots)} sunspots · solar flux ${Math.round(spaceWeather.f107_sfu)}`}
          >
            ☀ {STORM_LABEL[storm] ?? STORM_LABEL[0]} · <span>Real NASA data from {formatDate(spaceWeather.date)}</span>
          </p>
        )}

        {latest && !decision && (
          <p key={latest.key} className={`mv-toast mv-tone-${latest.tone}`} aria-live="polite">
            {latest.text}
          </p>
        )}

        <div className="mv-gauges">
          <Gauge
            label="Science returned"
            share={fillShare(science, scienceGoal)}
            value={scienceGoal > 0 ? `${formatPoints(science)} / ${formatPoints(scienceGoal)}` : formatPoints(science)}
            tone={scienceGoal > 0 && science >= scienceGoal ? 'good' : 'info'}
          />
          <Gauge
            label="On-board storage"
            share={fillShare(stored, storage)}
            value={lost > 0 ? `${formatGb(lost)} lost` : formatGb(stored)}
            tone={lost > 0 ? 'bad' : storage > 0 && stored >= storage * 0.9 ? 'warn' : 'info'}
          />
          <Gauge
            label="Money spent"
            share={fillShare(spent, budget)}
            value={budget > 0 ? `${formatUsd(spent)} / ${formatUsd(budget)}` : formatUsd(spent)}
            tone={budget > 0 && spent > budget ? 'bad' : 'info'}
          />
        </div>

        {decision && (
          <div className="mv-modal">
            <DecisionCard
              decision={decision}
              onDecide={onDecide ?? (() => {})}
              when={phase === 'operations' && missionDay > 0 ? `Day ${Math.floor(missionDay)}` : eventWhen(state.t_s)}
              canAnswer={canDecide ?? !!onDecide}
            />
          </div>
        )}
      </div>

      <details className="mv-more">
        <summary>Mission log and data ({lines.length})</summary>
        <dl className="mv-stats">
          <div>
            <dt>Collected</dt>
            <dd>{formatGb(num(m, 'data_generated_gb'))}</dd>
          </div>
          <div>
            <dt>Sent home</dt>
            <dd>{formatGb(num(m, 'data_downlinked_gb'))}</dd>
          </div>
          <div className={lost > 0 ? 'mv-tone-warn' : undefined}>
            <dt>Lost</dt>
            <dd>{formatGb(lost)}</dd>
          </div>
        </dl>
        <p className="mv-muted mv-small">Science only counts once its data reaches the ground.</p>
        <ol className="mv-log" aria-label="Mission log">
          {lines.map((line) => (
            <li key={line.key} className={`mv-tone-${line.tone}`}>
              <span className="mv-log__when">{line.when}</span>
              <span>{line.text}</span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  )
}

/** A compact ring gauge, value next to it. */
function Gauge({ label, share, value, tone }: { label: string; share: number; value: string; tone: string }) {
  return (
    <div className={`mv-gauge mv-tone-${tone}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}>
      <span className="mv-gauge__ring" style={{ ['--share' as string]: `${share * 100}%` }} />
      <span className="mv-gauge__text">
        <span className="mv-gauge__label">{label}</span>
        <strong>{value}</strong>
      </span>
    </div>
  )
}
