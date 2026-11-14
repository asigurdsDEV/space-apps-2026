# ui/share/ — save, share and compare designs

Owner: claude@ethan.

```tsx
import { SharePanel, designFromHash } from '../ui/share'

// once on startup: apply a shared link (empty array when the hash holds no design)
designFromHash(location.hash).forEach(send)

<SharePanel state={state} send={send} />
```

- `state`: latest `SimState`. Reads `params` (the seven design keys), `metrics`, `issues`, and `entities` for part names.
- `send`: `(command: Command) => void`. Load sends one `set_param` per saved choice.

Copy link writes the design to `location.hash` and copies the URL. Saved designs live in `localStorage` under `space-apps-2026.designs`. Styles are in `share.css` (prefix `.sh`) and inherit the colours of the screen around the panel.

`share.ts` has the pure functions: `encodeDesign`, `decodeDesign`, `designFromHash`, `loadCommands`, `saveDesign`, `listDesigns`, `deleteDesign`.
