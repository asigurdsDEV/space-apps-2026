// Turns sim events into one line a student can read in the mission log.

import type { SimEvent } from '../../shared'
import { formatMetric, metricLabel, outcomeLabel, outcomeTone, phaseLabel, type Tone } from './format'

export interface LogLine {
  /** Stable React key: tick + position in the event list. */
  key: string
  /** Sim time of the event, seconds since launch. */
  t_s: number
  /** Short label for the time column, from `eventWhen`. */
  when: string
  text: string
  tone: Tone
}

const DAY_S = 86400

/** Metrics where going over the threshold is good news, not a problem. */
const GOOD_WHEN_UP = new Set(['science_score'])

export function eventText(event: SimEvent): { text: string; tone: Tone } | null {
  switch (event.type) {
    case 'scenario_started':
      return { text: 'Scenario loaded. Design your spacecraft, then launch.', tone: 'info' }

    case 'phase_changed': {
      const { to } = event.payload
      if (to === 'cruise') return { text: 'Liftoff! The spacecraft is climbing to its orbit.', tone: 'good' }
      if (to === 'operations') return { text: 'In orbit. Science operations have started.', tone: 'good' }
      if (to === 'ended') return { text: 'The mission is over.', tone: 'info' }
      return { text: `Phase: ${phaseLabel(event.payload.from)} → ${phaseLabel(to)}.`, tone: 'info' }
    }

    case 'entity_added': {
      const { entity } = event.payload
      if (entity.kind === 'spacecraft') return { text: `${entity.name} is on its way.`, tone: 'info' }
      if (entity.kind === 'body') return null // the body appears with the spacecraft; one line is enough
      return { text: `${entity.name} added.`, tone: 'info' }
    }

    case 'entity_removed':
      return { text: `${event.payload.id} removed: ${event.payload.reason}`, tone: 'warn' }

    case 'threshold_crossed': {
      const { metric, value, threshold, direction } = event.payload
      const label = metricLabel(metric)
      const amounts = `${formatMetric(metric, value)} / ${formatMetric(metric, threshold)}`
      if (GOOD_WHEN_UP.has(metric)) {
        return direction === 'up'
          ? { text: `${label} goal reached (${amounts}).`, tone: 'good' }
          : { text: `${label} dropped below the goal (${amounts}).`, tone: 'warn' }
      }
      if (metric === 'data_stored_gb') {
        return { text: `On-board storage is full (${amounts}). New data is being lost.`, tone: 'warn' }
      }
      return direction === 'up'
        ? { text: `${label} is over the limit (${amounts}).`, tone: 'bad' }
        : { text: `${label} is back under the limit (${amounts}).`, tone: 'good' }
    }

    case 'scenario_ended': {
      const { reason } = event.payload
      return { text: `${outcomeLabel(reason)}.`, tone: outcomeTone(reason) }
    }

    case 'warning':
      return { text: event.payload.message, tone: 'warn' }

    default:
      return null
  }
}

/** Newest first, at most `limit` lines, skipping events that have nothing to say. */
export function logLines(events: readonly SimEvent[], limit = 50): LogLine[] {
  const lines: LogLine[] = []
  for (let i = events.length - 1; i >= 0 && lines.length < limit; i--) {
    const event = events[i]
    const line = eventText(event)
    if (line) lines.push({ key: `${event.tick}-${i}`, t_s: event.t_s, when: eventWhen(event.t_s, event.type), ...line })
  }
  return lines
}

/**
 * When an event happened, as time since launch: "T+12d". Sim time stands still at 0 during design,
 * so t_s = 0 is either a design event or the launch itself.
 */
export function eventWhen(t_s: number, type?: SimEvent['type']): string {
  if (t_s > 0) return `T+${Math.floor(t_s / DAY_S)}d`
  return type === 'phase_changed' || type === 'entity_added' ? 'Launch' : 'Design'
}
