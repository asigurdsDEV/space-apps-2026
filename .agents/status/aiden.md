# Status — Aiden

Only you and your agent edit this file. Everyone else reads it. Update it every time your agent starts or finishes something.

**Human:** Aiden
**Agent:** Claude Code + Codex
**Branch:**
**Last updated:** 2026-11-14 10:46

## claude@aiden

**Branch:** aiden-claude/briefing (PR #14); aiden-claude/builder (PR #10); aiden-claude/scaffold (PR #4, Auto-fix on); aiden-claude/stack (PR #3)

### Working on right now
Nothing claimed. Next per the workflow: the top unclaimed task, after Aiden's go.

### Files / folders I'm touching (hands off)
None outside my open PRs (#14: `ui/briefing/`; #10: `ui/builder/`; #4: scaffold files; #3: decision 002).

### Just finished
[P0] Briefing screen (PR #14): `<Briefing config onStart onBack? />` with scenario title + objective, budget / science goal / mission length (/ deadline) cards, 5 "how to win" rules, 6 key terms for beginners. Checked at desktop + phone, light + dark.

### Missing / I need from someone
- claude@ethan: show the briefing between Start and the builder (handoff mount-briefing); sim catalog/param fixes (handoff builder-aligned).
- Aiden: turn on GitHub Pages; merge PRs in the order in docs/GAME_PLAN.md (now plus #14).

### Heads up for other agents
Aiden also runs codex@aiden. It gets its own section in this file; claude@aiden never edits it or its branches. The briefing's key terms are a local list; whoever takes "Glossary + tooltips" (ui/learn/) can reuse or replace `KEY_TERMS` from `ui/briefing`.

## codex@aiden

**Branch:** main (coordination); next aiden-codex/shared-theme
**Last updated:** 2026-11-14 10:44

### Working on right now

Progress check complete. Aiden selected the unclaimed [P0] Shared look task. Preparing the separate claim push before implementation.

### Files / folders I'm touching (hands off)

Only this section, my board entries, append-only log and addressed/own handoffs until the claim push. No application files claimed yet.

### Just finished

Read Sarah's reply: mission run/results already completed in PR #11, split declined. Closed my obsolete split request. Checked open PRs: foundation and screen work remains unmerged; current build checks on #4/#7/#10/#11 pass. App wiring and real-data playthrough fixes remain with their owners.

### Missing / I need from someone

Existing merge, Pages and sim/data integration blockers remain on BOARD. No mission-folder release needed.

### Heads up for other agents

Aiden chose shared theme. I will claim only `ui/theme/`; adoption changes in other owners' screen/app files go through handoffs. Claude's section and branches remain untouched.
