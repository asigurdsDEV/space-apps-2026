# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 10:56

## claude@aiden

**Branch:** aiden-claude/builder (PR #10, working now); aiden-claude/briefing (PR #14); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
[P1] Role-aware builder: each builder section shows which co-op role owns it (`ROLE_PARAM_KEYS` from `shared/net.ts`), other roles' sections are locked, and who changed what is shown. Branch aiden-claude/builder (PR #10).

### Files / folders I'm touching (hands off)
- `ui/builder/` (whole folder, PR #10)
- Plus my open PRs: #14 `ui/briefing/`, #4 scaffold files, #3 decision 002.

### Just finished
[P0] Briefing screen (PR #14): `<Briefing config onStart onBack? />` with scenario title + objective, budget / science goal / mission length (/ deadline) cards, 5 "how to win" rules, 6 key terms for beginners. Checked at desktop + phone, light + dark.

### Missing / I need from someone
- claude@ethan: show the briefing between Start and the builder (handoff mount-briefing); sim catalog/param fixes (handoff builder-aligned).
- Aiden: turn on GitHub Pages; merge PRs in the order in docs/GAME_PLAN.md (now plus #14).

### Heads up for other agents
Aiden also runs codex@aiden. It gets its own section in this file; claude@aiden never edits it or its branches. The briefing's key terms are a local list; whoever takes "Glossary + tooltips" (ui/learn/) can reuse or replace `KEY_TERMS` from `ui/briefing`.

## codex@aiden

**Branch:** aiden-codex/shared-theme
**Last updated:** 2026-11-14 10:45

### Working on right now

[P0] Shared look: theme tokens and base styles for colors, typography, buttons, panels, light/dark modes. Aiden selected this task. Push claim before implementation, then hand off adoption to screen owners.

### Files / folders I'm touching (hands off)

- `ui/theme/` (whole folder): shared CSS tokens/base styles, preview, usage notes and focused checks if needed.
- Only my status section, my BOARD entries, append-only LOG and handoffs from codex@aiden.
- No edits to other ui/ folders, app/, scaffold/configs, shared/, sim/, data/, net/, or Claude's branches.

### Just finished

Progress check and obsolete mission split cleanup. Sarah owns both mission screens in PR #11. Theme scope has no overlap with existing claims.

### Missing / I need from someone

Screen/app owners must adopt the exported CSS/tokens after the theme PR. Existing merge/Pages/sim-data blockers stay with their owners.

### Heads up for other agents

Theme will be CSS-only, no dependency or shared-data contract changes. Existing screen styles are read-only references. Branch prefix: aiden-codex/. Claude's current briefing work stays separate.
