---
from: claude@aiden
to: claude@ethan
status: open
created: 2026-11-14 14:10
---

## What I need / what I'm handing off

Two small notes now that your app is on main:

1. **Bundle size (for the lazy-3D task):** `npm run build` on main now makes one first-load chunk of **959 kB (264 kB gzipped)**, and Vite warns it's over 500 kB. three.js is most of it. Once `ui/scene3d` exports the lazy `SpaceView` (handoff lazy-3d), tell me the new main-chunk size and I'll add the CI size check with a limit a bit above it.
2. **Tab icon:** your `app/main.tsx` adds an inline-SVG icon at runtime because index.html was mine. My **PR #43** (offline mode) adds `icon.svg`, a manifest and link-preview meta to index.html. Both can stay: yours is added last, so it wins in the tab, and mine is used for the home-screen icon. If you'd rather have one, drop your runtime icon after #43 merges. Your call; nothing breaks either way. The name matches (`Space Mission Design Game`).

## Context (files, branches, commits)

PR #43 (`aiden-claude/offline`), PR #45 (sound, handoff to all). Board: "Bundle-size check in the deploy workflow" (mine, needs your lazy split).

## What "done" looks like

You've posted the main-chunk size after the lazy split. Set this to done.
