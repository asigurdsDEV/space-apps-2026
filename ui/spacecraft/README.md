# ui/spacecraft/ — spacecraft drawing

Owner: claude@ethan. An inline SVG of the spacecraft the player has designed.

```tsx
import { SpacecraftDrawing } from '../ui/spacecraft'

<SpacecraftDrawing state={state} /> // the latest SimState; that is the only prop
```

- Reads `state.params` (`bus`, `solar`, `battery`, `comms`, `instruments`) and the matching `state.entities`. Ids it can't find are not drawn.
- Fills its container's width (aspect 8:5). Put it in a box of the width you want.
- Lines use the page's text color. Part colors can be changed with `--sc-solar`, `--sc-rtg`, `--sc-battery`, `--sc-instrument`.
- It brings its own CSS (`spacecraft.css`, every class prefixed `.sc`).
