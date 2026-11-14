# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 11:03

## claude@aiden

**Branch:** aiden-claude/builder (PR #10); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
Adopting the shared theme (codex@aiden handoff shared-theme-ready, PR #16) in my two screens: `--mb-*`/`--br-*` point at `--game-*` tokens, local dark palettes removed. Stacks PR #10 and #14 on #16.

### Files / folders I'm touching (hands off)
- `ui/builder/` (PR #10), `ui/briefing/` (PR #14). Read-only: `ui/theme/` (codex@aiden).

### Just finished
[P1] Role-aware builder (PR #10): with 2+ players each section shows its role + holder, other roles' sections are locked, "Last changed by …" per section, Launch only for mission planning. Optional props `players` + `me` (Session snapshot). Also: tsconfig type-checks `tests/` (PR #4, for claude@jamie).

### Missing / I need from someone
- claude@ethan: `ROLE_PARAM_KEYS` needs `solar`, `battery`, `comms` (or whatever keys the sim reads); pass `players`/`me` to the builder (handoff role-keys).
- claude@ethan: show the briefing between Start and the builder (handoff mount-briefing); sim catalog/param fixes (handoff builder-aligned).
- Aiden: turn on GitHub Pages; merge PRs in the order in docs/GAME_PLAN.md (now plus #14).

### Heads up for other agents
Aiden also runs codex@aiden. It gets its own section in this file; claude@aiden never edits it or its branches. The briefing's key terms are a local list; whoever takes "Glossary + tooltips" (ui/learn/) can reuse or replace `KEY_TERMS` from `ui/briefing`.

## codex@aiden

**Branch:** aiden-codex/shared-theme (PR #16)
**Last updated:** 2026-11-14 10:53

### Working on right now

No active implementation task. Shared theme complete in PR #16; awaiting review/adoption. Aiden selected this task; wait for Aiden's next selection before claiming more work.

### Files / folders I'm touching (hands off)

- `ui/theme/` owned by codex@aiden for PR #16 follow-ups; no new edits underway.
- Only my status section, my BOARD entries, append-only LOG and own/addressed handoffs.
- No other screen/app/source files or Claude branches edited.

### Just finished

[P0] Shared look in PR #16: CSS tokens for color/type/spacing, light/dark device preference and explicit overrides, scoped base styles, panels/buttons/fields, 44px controls, visible focus and reduced motion. Includes standalone preview, adoption README and Node-only contrast self-check. Both palettes pass AA text/status/primary-label contrast and 3:1 control/focus contrast. Browser checked at 1280px and 390px: no horizontal overflow, dark/light render, keyboard focus visible. Closed the obsolete Sarah split request.

### Missing / I need from someone

- claude@ethan: import theme CSS once and add game-theme wrapper in app/.
- claude@aiden, claude@sarah, codex@jamie: adopt shared tokens in owned screens; details in all-handoff and ui/theme/README.md. Added adoption to BOARD Missing.
- Existing foundation merges, Pages enablement and sim/data adapter/playthrough verification remain with their owners.

### Heads up for other agents

PR #16 touches only ui/theme/. No dependencies or shared-data contract changes. Existing screen palettes are not overridden automatically. Primary buttons need --game-on-accent text; dark accent is pale blue. Full app build/live multiplayer were not tested for this standalone CSS change; system-light and explicit HTML-root override weren't separately emulated (forced light/dark containers were checked).
