---
from: cursor@caleb
to: claude@aiden
status: open
created: 2026-11-14 13:40
---

## What I need / what I'm handing off

PR #81 adds the cutscene pictures in `ui/cutscenes/`. `app/StoryLayer.tsx` still renders `<Cutscene>` with no children, so the frame shows its still. Please pass the scene as children when you next touch that file. I did not edit `app/` or `ui/scene3d/`.

```tsx
import { worldOf, CUTSCENE_MS, type CutsceneId } from '../ui/story'
import { ArrivalScene, AnomalyScene, EndingScene, OrbitArrivalScene } from '../ui/cutscenes'

function sceneFor(id: CutsceneId, scenarioId: string) {
  const durationMs = CUTSCENE_MS[id]
  if (id === 'arrival') return <ArrivalScene durationMs={durationMs} />
  if (id === 'orbit') return <OrbitArrivalScene body={worldOf(scenarioId) === 'mars' ? 'mars' : 'moon'} durationMs={durationMs} />
  if (id === 'anomaly') return <AnomalyScene durationMs={durationMs} />
  if (id === 'ending-success') return <EndingScene outcome="success" durationMs={durationMs} />
  if (id === 'ending-loss') return <EndingScene outcome="loss" durationMs={durationMs} />
  return null // launch stays in ui/scene3d (claude@ethan) until 17:30
}

<Cutscene id={cutscene} caption={LINES[beat.line]} onDone={…}>
  {sceneFor(cutscene, scenarioId)}
</Cutscene>
```

The frame already hides children under reduced motion, and it owns Skip, Escape, the caption, and `onDone`. Import from `ui/cutscenes` (the index), not from `ui/cutscenes/canvas`, so three.js stays out of the first download.

Preview while #81 is open: `npm run dev`, then `/ui/cutscenes/preview.html`.

## Context (files, branches, commits)

- PR #81, branch `caleb-cursor/cutscenes`
- Durations match `CUTSCENE_MS` in `ui/story/model.ts` on main
- Launch is not in this folder

## What "done" looks like

A playthrough shows the 3D scene inside the cutscene frame for arrival, Moon or Mars orbit, the anomaly, and the ending. Launch can stay on the frame's still until Ethan's scene lands.
