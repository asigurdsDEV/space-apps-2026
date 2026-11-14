# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 11:10

## claude@aiden

**Branch:** aiden-claude/builder (PR #10); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
Nothing claimed. Next: top unclaimed Open task.

### Files / folders I'm touching (hands off)
None outside my open PRs (#14: `ui/briefing/`; #10: `ui/builder/`; #4: scaffold files; #3: decision 002).

### Just finished
Shared theme adopted in builder (PR #10) + briefing (PR #14): local palettes → `--game-*` tokens, dark palettes removed. Both PRs now stack on PR #16 (merge #16 first).
[P1] Role-aware builder (PR #10): with 2+ players each section shows its role + holder, other roles' sections are locked, "Last changed by …" per section, Launch only for mission planning. Optional props `players` + `me` (Session snapshot). Also: tsconfig type-checks `tests/` (PR #4, for claude@jamie).

### Missing / I need from someone
- claude@ethan: `ROLE_PARAM_KEYS` needs `solar`, `battery`, `comms` (or whatever keys the sim reads); pass `players`/`me` to the builder (handoff role-keys).
- claude@ethan: show the briefing between Start and the builder (handoff mount-briefing); sim catalog/param fixes (handoff builder-aligned).
- Aiden: turn on GitHub Pages; merge PRs in the order in docs/GAME_PLAN.md (now plus #14).

### Heads up for other agents
Aiden also runs codex@aiden. It gets its own section in this file; claude@aiden never edits it or its branches. The briefing's key terms are a local list; whoever takes "Glossary + tooltips" (ui/learn/) can reuse or replace `KEY_TERMS` from `ui/briefing`.

## codex@aiden

**Branch:** aiden-codex/leaderboard
**Last updated:** 2026-11-14 11:00

### Working on right now

[P2] Local leaderboard: best score + design per scenario saved on this device, with a component for results-screen owner to mount. Aiden asked me to find new work. Higher-priority Open tasks are blocked by merges/live devices or owned elsewhere.

### Files / folders I'm touching (hands off)

- `ui/leaderboard/` (new, whole folder): localStorage persistence, results component, scoped styles, tests, preview and integration README.
- Only my status section, own BOARD entries, append-only LOG and own/addressed handoffs.
- No edits to ui/mission/ (Sarah), app/ (Ethan), other UI folders, package/config/shared/sim/data/net, or Claude's branches.

### Just finished

Synced/read team coordination. Builder and briefing adopted my shared theme (Claude's FYI); acknowledged. Verified leaderboard remains unclaimed. Claim push precedes implementation.

### Missing / I need from someone

claude@sarah: mount the leaderboard on results after the PR; will supply exact props/imports. Existing merge/Pages/app/sim-data blockers stay with their owners.

### Heads up for other agents

Scores remain local to the browser/device; no online ranking or server. Existing shared types and theme will be reused. Browser storage is treated as untrusted and may be unavailable; game results must still work. Branches: aiden-codex/<short-task>.
