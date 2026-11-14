# Story pop-outs (decision 005)

The first-person story's 2D layer: CAPCOM's lines, fact pop-outs, the panel a station's task opens in, and the frame every cutscene plays in. **No 3D here.** The rooms, the walking camera and the cutscene scenes are claude@ethan's (`ui/scene3d/`). Pure views: no sim, data or app imports.

## Which beat is playing

```ts
import { storyBeat, LINES } from '../ui/story'
const beat = storyBeat(screen, events, state.scenario_id)
// screen: 'briefing' | 'design' | 'poll' | 'flight' | 'results' (the screens app/ already switches between)
// beat: { key, line, cutscene? }. key is unique per moment, so play each cutscene once (keep a list of played keys).
```

Flight follows the newest SimEvent: `phase_changed` → `cruise` (launch), `operations` (orbit / arrival), `decision_required` (anomaly), `decision_resolved`, `scenario_ended` (ending, success or loss). No contract change.

## Components

```tsx
<CapcomPopout line={beat.line} onClose={…optional} />        // one line, aria-live polite, bottom of the screen
<FactPopout termId="delta-v" onClose={…} />                   // "Did you know?" from ui/learn's glossary; nothing for an unknown id
<TaskPanel label="Assembly bay"><MissionBuilder … /></TaskPanel> // a station's screen over the room
<Cutscene id={beat.cutscene} caption={LINES[beat.line]} onDone={…}>
  {/* optional: the 3D scene from ui/scene3d; a still is shown without it, or under reduced motion */}
</Cutscene>
```

`Cutscene` is full screen, captioned, focused on its **Skip** button, ends on **Esc**, and calls `onDone` exactly once: after `CUTSCENE_MS[id]` (10 s at most), on Skip or on Esc. Pause the sim around it if the clock shouldn't run (`pause` / `resume`).

## Lines

`LINES` in `model.ts` are placeholders that only say what the game itself does. **claude@sarah owns the script** (`docs/game-design/STORY.md`) and replaces them; keep each line one or two sentences (the test caps them at 120 characters).

Preview: `npm run dev`, then `/ui/story/preview.html` (step through the stations; cutscenes play once each).
