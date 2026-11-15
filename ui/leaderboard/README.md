# Local personal best

One highest score plus its complete design snapshot per scenario, saved in this browser's localStorage. Optional daily seeds keep each day's records separate. Optional stars are stored with the score/design that earned them. Ties retain the first record. No online leaderboard, score verification, or cross-device sync.

```tsx
import { LocalLeaderboard } from '../ui/leaderboard'

// Mount only after state.status === 'ended', with the final summary.
<LocalLeaderboard scenarioId={state.scenario_id} summary={summary} design={state.params} />

// Add these props only when available from the app/results owner:
<LocalLeaderboard scenarioId={state.scenario_id} summary={summary} design={state.params}
                  dailySeed={dailyMission?.seed} stars={awardedStars} />
```

Props use existing `Summary` and `Params` types from `shared/`. `summary.score` must be a finite number. `dailySeed` is optional, a nonnegative safe integer; the agreed daily-mission convention is UTC `YYYYMMDD`. Only pass it for a daily mission, not every normal Config.seed. `stars` is optional, an integer from 0 to 3, supplied by results: the existing `stars(summary, bonusGoal)` helper exported from `ui/mission` returns a list, so pass `starList.filter(star => star.earned).length`. This component does not compute star rules. Invalid supplied metadata prevents saving; it never silently writes to the regular record.

React reads/writes storage in an effect (safe to server-render). A seed change clears the previous daily view until the new record loads. The component includes shared theme CSS and scoped `.lb-*` styles. It can render beside the existing results screen so Sarah does not need to change ResultsScreen's props; app/ already has scenario and design state. Alternatively Sarah can pass them through MissionScreen/ResultsScreen in her own files.

Regular storage keys are `space-apps-2026:best:v2:<encoded scenario id>`. Daily keys are `space-apps-2026:daily-best:v2:<encoded scenario id>:<daily seed>`. Scores are out of 1,000 since v2; v1 keys (out of 100) are no longer read. Legacy v2 records with no stars remain valid and are not migrated or deleted. An old best with no stars never borrows the new run's stars. Lower or tied scores preserve the original score, design and stars together, even if the new run has more stars. Stars shown here describe that saved score's design; this package does not compute mission-program unlocks or maximum-star progression.

Only the exact selected record key is touched; nothing calls `localStorage.clear()`. Invalid JSON/records are replaced by the current valid result. A blocked getter/read/write or quota failure leaves results usable and displays an honest unsaved message. Data read from storage is validated, and React escapes design labels/values.

Regular scores are grouped by scenario ID (difficulty variants already have distinct scenario IDs); different daily seeds are separate. This is a personal record, not a fairness-ranked competition. Browser data clearing removes records. Owners should call this once per completed run, not every sim tick. Multiple tabs writing at exactly the same time are not coordinated; add cross-tab coordination if that becomes a gameplay requirement.

After scaffold/shared/theme are available, run `npm test -- ui/leaderboard` and `npm run build`. For the interactive preview, run `npm run dev` and visit `/ui/leaderboard/preview/preview.html`. Preview scenario IDs are prefixed `preview-`; sample controls do not run the simulator.

Integration stays with Sarah (`ui/mission/`) and Ethan (`app/`). No caller or shared contract was changed here.
