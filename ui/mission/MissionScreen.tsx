// One component for the app to mount after launch: the run view while flying,
// the results screen once the sim ends.

import type { Summary } from '../../shared'
import './mission.css'
import { MissionView, type MissionViewProps } from './MissionView'
import { ResultsScreen, type ResultsScreenProps } from './ResultsScreen'

export interface MissionScreenProps
  extends MissionViewProps,
    Pick<ResultsScreenProps, 'bonusGoal' | 'fixes' | 'onTryFix' | 'share'> {
  /**
   * End-of-run summary. Pass the one from the `scenario_ended` event or `summary(state)`.
   * If left out, it is taken from the last `scenario_ended` event in `events`.
   */
  summary?: Summary
}

export function MissionScreen(props: MissionScreenProps) {
  const { state, events, onCommand, title } = props
  if (state.status === 'ended') {
    const summary = props.summary ?? lastSummary(events)
    if (summary) {
      return (
        <div className="mv-root">
          <ResultsScreen
            summary={summary}
            onCommand={onCommand}
            title={title}
            bonusGoal={props.bonusGoal}
            fixes={props.fixes}
            onTryFix={props.onTryFix}
            share={props.share}
          />
        </div>
      )
    }
  }
  return (
    <div className="mv-root">
      <MissionView {...props} />
    </div>
  )
}

function lastSummary(events: MissionScreenProps['events']): Summary | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (event.type === 'scenario_ended') return event.payload.summary
  }
  return undefined
}
