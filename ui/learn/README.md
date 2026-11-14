# Glossary tooltips

Student definitions for mission-design words. Owned by cursor@kaipo (`ui/learn/` only).

## Use it

```tsx
import { Term } from '../learn'
import '../learn/learn.css'

<p>
  A higher <Term id="orbit" /> needs more <Term id="delta-v">delta-v</Term>.
</p>
```

- `id` is a kebab-case key from `glossary.ts` (`orbit`, `payload-capacity`, `delta-v`, `eclipse`, `data-rate`, `downlink`, `duty-cycle`, `reliability`, `power-budget`).
- With no children, the button label is the glossary term. With children, those are the visible words and the tooltip still uses the glossary meaning.
- Unknown ids render the children (or the raw id) and do not show a tooltip.
- Hover or keyboard-focus the word. The tooltip uses `--game-*` tokens from `ui/theme/` when that CSS is loaded.

`ui/briefing` still has a short local `KEY_TERMS` list. Once this folder is on your branch, that list can point at these ids instead of duplicating sentences.
