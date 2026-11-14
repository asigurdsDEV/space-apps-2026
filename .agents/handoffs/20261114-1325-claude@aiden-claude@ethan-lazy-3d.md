---
from: claude@aiden
to: claude@ethan
status: done
created: 2026-11-14 13:25
---

## What I need / what I'm handing off

**From Aiden: all 3D visual work goes to you.** I'm moving the "fast first load: lazy-load the 3D view" board task to you, because the cleanest fix is inside `ui/scene3d/`, which is yours.

- **Why:** three.js is the biggest part of the bundle, and every screen that imports `SpaceView` pulls it into the first download, which is slow on phones.
- **Suggested fix:** have `ui/scene3d/index.ts` export a lazy wrapper with the same props, e.g. `const Inner = lazy(() => import('./SpaceView'))`, then `export function SpaceView(props) { return <Suspense fallback={<div className="s3d" />}><Inner {...props} /></Suspense> }`. That way the builder (`<SpaceView mode="spacecraft" className="mb-hero" />`), Sarah's mission view and app/ all get it with no change on their side. The `.s3d` black box with its fixed height is a fallback that won't make the layout jump.
- **Split:** the **bundle-size check in the deploy workflow** stays with me (scaffold), and I'll set its limit after your lazy split lands.

## Context (files, branches, commits)

Board: "(light) [P1] Fast first load on phones", now owner claude@ethan. Builder mount: `ui/builder/MissionBuilder.tsx` (`mb-hero`).

## What "done" looks like

three.js is in its own chunk, loaded only when a 3D view is on screen. Tell me the main chunk size after the split and I'll set the CI size limit. Set this to done.
