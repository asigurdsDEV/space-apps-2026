# Local personal best

One highest score plus its complete design snapshot per scenario, saved in this browser's localStorage. Ties retain the first design. No online leaderboard, score verification, or cross-device sync.

```tsx
import { LocalLeaderboard } from '../ui/leaderboard'

// Mount only after state.status === 'ended', with the final summary.
<LocalLeaderboard scenarioId={state.scenario_id} summary={summary} design={state.params} />
```

Props use existing `Summary` and `Params` types from `shared/`. `summary.score` must be a finite number. React reads/writes storage in an effect (safe to server-render). The component includes shared theme CSS and scoped `.lb-*` styles. It can render beside the existing results screen so Sarah does not need to change ResultsScreen's props; app/ already has scenario and design state. Alternatively Sarah can pass them through MissionScreen/ResultsScreen in her own files.

Storage keys are `space-apps-2026:best:v1:<encoded scenario id>`. Only this key is touched; nothing calls `localStorage.clear()`. Invalid JSON/records are replaced by the current valid result. A blocked getter/read/write or quota failure leaves results usable and displays an honest unsaved message. Data read from storage is validated, and React escapes design labels/values.

Scores are grouped by scenario ID, including different seeds/difficulties of that scenario. This is a personal record, not a fairness-ranked competition. Browser data clearing removes records. Owners should call this once per completed run, not every sim tick. Multiple tabs writing at exactly the same time are not coordinated; add cross-tab coordination if that becomes a gameplay requirement.

After scaffold/shared/theme are available, run `npm test -- ui/leaderboard` and `npm run build`. For the interactive preview, run `npm run dev` and visit `/ui/leaderboard/preview/preview.html`. Preview scenario IDs are prefixed `preview-`; sample controls do not run the simulator.

Integration stays with Sarah (`ui/mission/`) and Ethan (`app/`). No caller or shared contract was changed here.
