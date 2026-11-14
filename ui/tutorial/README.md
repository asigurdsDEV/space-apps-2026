# First-time builder tips

`BuilderTutorial` is a non-modal coach-mark panel with four steps: orbit, resource bars, blocking issues, launch. It has Back/Next, final Got it, and Skip tips from every step. No overlay blocks the builder. No sim, data or app imports and no new dependency.

## Mounting (builder/app owner)

```tsx
import { BuilderTutorial } from '../ui/tutorial' // from app/; ../tutorial from builder/

<BuilderTutorial onShowStep={step => {
  // Optional: scroll/focus your own orbit, budgets, issues or launch section.
  // The component never queries another owner's DOM.
}} />
<MissionBuilder /* existing props */ />
```

Mount once, while designing, above/beside the builder. Optional `onShowStep` exposes `orbit | budgets | issues | launch`; without it, the Show me button is omitted and the tips still work. Screen owner can position the panel by its associated section if desired. Import theme CSS once in app/; all layout/palette selectors here are scoped `.bt-*`. Each step change is announced through an atomic polite live region. Controls are native buttons, keyboard focus stays visible, there is no focus trap or animation.

Completion and Skip are saved under `space-apps-2026:builder-tips:v1` as `completed` / `skipped`. It is a local preference, not a mission state or score. Saved dismissal hides the panel on subsequent mounts/reloads. Unknown values show the tutorial again. Blocked storage never crashes: dismissal still works for the current mount; it may reappear next visit. No other keys are read/changed.

Preview: `/ui/tutorial/preview.html`. It demonstrates Show me focus/scroll against preview-only targets and has a Replay button that clears only this tutorial preference. It does not mount into the real builder automatically; that source remains with its owner. No automatic progress based on guessed issue/param states.
