# Start screen

Pure view using React, shared types, and Term tooltips. No sim, data, network, or store runtime calls; difficulty is a type-only import. Exported from `ui/start/index.ts`.

```tsx
<StartScreen scenarios={configs} busy={connecting} error={connectionError}
  onStart={request => {
    // solo/host: request.scenarioId, request.name
    // join: request.code (full, case-sensitive), request.name; host owns scenario
  }} />
```

`StartRequest` is a discriminated union: `{ mode: 'solo' | 'host', name, scenarioId }` or `{ mode: 'join', name, code }`. Callbacks are synchronous intents; app owns async room creation, busy/error props and navigation (solo → briefing, host/join → lobby). `scenarios` accepts Config[] structurally (only scenario_id/title/params are read). The selected objective_text appears as the mission hint. With no scenarios, solo/host cannot submit; joining still works. Name is trimmed, required and limited to 40 characters. Room codes are trimmed but retain case.

App owner: mount and handle navigation in app/, not here. Pass a connection error as `error` and leave the screen mounted on a failed join so the user can retry or switch to solo. `busy` disables all form controls to prevent duplicate attempts. Uses scoped `.ss-*` classes and optional `--game-bg`, `--game-text`, `--game-panel` CSS overrides; no global rules or external assets.

Preview after scaffold: `npm run dev`, then `/ui/start/preview.html`. Preview reports submitted requests without opening a network connection. It does not demonstrate a playable integrated mission.

## Difficulty and teaching (follow-up)

Solo/host requests now include `difficulty: 'easy' | 'normal' | 'hard'` (default normal); join requests remain unchanged because the host chooses. App must initialize `getScenario(request.scenarioId, request.difficulty)` rather than ignoring the extra field.

Pass `scenarioPreview={getScenario}` to show the correct adjusted `budget_usd` and `target_science_score` for each level. This callback supplies Config metadata; the screen never repeats data's scaling math. Optional `difficultyLabels` accepts `{easy: DIFFICULTIES.easy.label, normal: DIFFICULTIES.normal.label, hard: DIFFICULTIES.hard.label}`. With no callback, only Normal displays base numbers; other levels defer numbers to the briefing to avoid showing incorrect values.

Start imports shared Term styling and teaches power budget/downlink outside interactive controls. App must import `ui/theme/theme.css` once; the screen uses the shared palette and font tokens for both light/dark modes. Preview imports theme itself and supplies actual scenarios + getScenario from data, with a preview-only theme selector.


## Daily mission (separate callback)

Ethan accepted the selection contract in his 11:41 all-handoff: UTC date, YYYYMMDD seed, Normal difficulty, base scenario IDs sorted by code-point order. `dailyMissionForDate(date, ids)` is a pure helper: it returns `{ date, scenarioId, seed, difficulty: 'normal' }` or null for no scenarios/invalid dates. It never reads the clock or mutates a Config. Call it with the current Date from app/, and refresh at UTC midnight (or when the app regains focus).

```tsx
const daily = dailyMissionForDate(now, configs.map(c => c.scenario_id))
<StartScreen scenarios={configs} scenarioPreview={getScenario}
  dailyMission={daily} onDailyMission={request => {
    // App: obtain base Normal scenario; clone and override config.seed with request.seed.
    // Consider a daily/date-specific scenario ID for separate leaderboard records.
    // Pass request.name to solo session; do not use the ordinary difficulty picker.
  }} onStart={handleOrdinaryStart} />
```

Daily button appears only in Solo mode when both descriptor and callback are supplied and the scenario exists. It validates/trims the same name, emits a separate DailyMissionRequest, and honors busy state. No new StartRequest variant or net/sim command was added. App must apply the specified seed before init; rendering the button alone does not establish daily gameplay. Selection is stable for an identical set of base scenario IDs; adding/removing IDs can change that day's chosen scenario, so ship one catalog revision for all players. This is a shared challenge, not a verified global leaderboard. Program progression/unlocks require scenario-order and star-progress inputs and are not invented here.
