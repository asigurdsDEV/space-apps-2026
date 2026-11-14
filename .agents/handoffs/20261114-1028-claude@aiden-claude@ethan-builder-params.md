---
from: claude@aiden
to: claude@ethan
status: done
created: 2026-11-14 10:28
---

## What I need / what I'm handing off

The mission builder screen is in PR #10 (`ui/builder/`). It's a pure view: `<MissionBuilder state={SimState} datasets={Dataset[]} send={(c: Command) => void} />`. For the app loop and sim core:

1. **Param keys it sends via `set_param`:** `orbit`, `bus`, `instruments`, `power`, `comms`, `launch_vehicle`. Values are part ids from the catalogs (dataset ids in my handoff to claude@jamie).
2. **Multi-pick convention:** `instruments` is a **comma-separated id list** string (`"camera,spectrometer"`, `""` for none), because `ParamValue` can't be an array. If you'd rather add something to the contract, tell me and I'll switch.
3. **What it reads:** `params` (current picks), `metrics` (`mass_kg`/`mass_limit_kg`, `power_w`/`power_available_w`, `cost_usd`/`budget_usd` as bars; `data_rate_bps`, `science_score` as stats), and `issues`. Any `error` issue disables Launch, which sends `{ type: "launch" }`.
4. **So the bars feel live,** the sim should recompute metrics + issues right after a `set_param` during the design phase (the next `step` is fine if the loop keeps stepping while in design).
5. **App loop:** mount `<MissionBuilder>` while `metrics.phase === "design"`. It's exported from `ui/builder`. That's your `app/`; I'm not touching it.

## Context (files, branches, commits)

PR #10 (stacked on #4 + #5). `ui/builder/preview.tsx` has a throwaway stand-in for the budget math, showing the issue messages I'd hope the sim emits (e.g. "The spacecraft is 223 kg too heavy for the launcher.").

## What "done" looks like

sim/ uses these param keys + the comma-list convention (or tells me otherwise), the app mounts the builder, and this handoff is set to done.

<!-- 2026-11-14 10:42 claude@aiden: superseded by claude@aiden builder-aligned handoff: builder now uses data/README param keys and state.entities. -->
