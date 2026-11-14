# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 11:50

## claude@aiden

**Branch:** aiden-claude/scene3d (PR #22); aiden-claude/builder (PR #10); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
Nothing claimed. Next: top unclaimed Open task.

### Files / folders I'm touching (hands off)
None outside my open PRs (#14: `ui/briefing/`; #10: `ui/builder/`; #4: scaffold files; #3: decision 002).

### Just finished
[P2] 3D space view (decision 003, PR #22): `<SpaceView state mode>` in `ui/scene3d/`, a three.js planet (Earth/Moon/Mars, clouds, night lights, atmosphere), stars, Sun, the orbit and a spacecraft built from the picked parts. The builder (PR #10) opens with the 3D close-up. `three` added to PR #4.
Shared theme adopted in builder (PR #10) + briefing (PR #14): local palettes → `--game-*` tokens, dark palettes removed. Both PRs now stack on PR #16 (merge #16 first).
[P1] Role-aware builder (PR #10): with 2+ players each section shows its role + holder, other roles' sections are locked, "Last changed by …" per section, Launch only for mission planning. Optional props `players` + `me` (Session snapshot). Also: tsconfig type-checks `tests/` (PR #4, for claude@jamie).

### Missing / I need from someone
- claude@ethan: `ROLE_PARAM_KEYS` needs `solar`, `battery`, `comms` (or whatever keys the sim reads); pass `players`/`me` to the builder (handoff role-keys).
- claude@ethan: show the briefing between Start and the builder (handoff mount-briefing); sim catalog/param fixes (handoff builder-aligned).
- Aiden: turn on GitHub Pages; merge PRs in the order in docs/GAME_PLAN.md (now plus #14).

### Heads up for other agents
`ui/scene3d/` (PR #22) is handed to claude@ethan (Aiden: build the 3D on Ethan's Fable). I don't edit it anymore; dependency requests for it still come to me (scaffold).
Aiden also runs codex@aiden. It gets its own section in this file; claude@aiden never edits it or its branches. The briefing's key terms are a local list; whoever takes "Glossary + tooltips" (ui/learn/) can reuse or replace `KEY_TERMS` from `ui/briefing`.

## codex@aiden

**Branch:** main (merge coordination); temporary isolated rehearsal/merge branches only
**Last updated:** 2026-11-14 11:26

### Working on right now

Aiden explicitly asked Codex to execute merge batch #3 #2 #4 #5 #6 #7 #8 #9 #16 #10 #11 #13 #14 #15 and verify the existing Vite Pages deployment. Current #10 requires #22 first (updated GAME_PLAN). This temporarily supersedes the earlier Ethan-only merge delegation for this batch.

### Files / folders I'm touching (hands off)

- Main: merge commits of requested PRs and required #22; no source branch changes/deletions.
- README integration conflicts only, preserving all agents' sections/rows; no feature edits.
- Own status/BOARD lines, append-only LOG, handoffs, and the prior codex-authored AGENTS merge-coordinator note to record temporary batch ownership.
- Claude Aiden's status section and source branches remain untouched. No generic Pages workflow or Pages Source setting change.

### Just finished

Verified Pages already uses workflow source, read current deploy.yml (Vite npm test/build + Pages artifact/deploy), inspected current PR heads/checks. #6 conflicts with README; #22 is now required by #10. No competing merge claim recorded from Ethan.

### Missing / I need from someone

App loop/sim-data integration is not in the user's listed PR batch. I will verify what this batch actually deploys and report remaining app wiring honestly. Source issues beyond necessary integration conflicts go back to owners.

### Heads up for other agents

Ethan: hold merge execution for this named batch while Codex performs Aiden's newer direct instruction. Everyone may continue source work; moving PR heads must be rechecked. Existing Pages Actions workflow in #4 is the only deployment workflow to use.
