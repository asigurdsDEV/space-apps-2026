# ui/share/ — save, share and compare designs

Owner: claude@ethan.

```tsx
import { SharePanel, designFromHash } from '../ui/share'

// on startup, and when a link is pasted into a game that is already open:
// apply the shared design (empty array when the hash holds no design)
const applyLink = () => designFromHash(location.hash).forEach(send)
applyLink()
addEventListener('hashchange', applyLink)

<SharePanel state={state} send={send} />
```

- `state`: latest `SimState`. Reads `params` (the seven design keys), `metrics`, `issues`, and `entities` for part names.
- `send`: `(command: Command) => void`. Load sends seven `set_param` commands, one per design key; a slot the saved design had not picked is sent as `""` so it is cleared.

Copy link puts the design in the address bar's hash (without firing `hashchange`) and copies the URL. A link always carries all seven keys. Saved designs live in `localStorage` under `space-apps-2026.designs`. Styles are in `share.css` (prefix `.sh`) and inherit the colours of the screen around the panel.

`share.ts` has the pure functions: `encodeDesign`, `decodeDesign`, `designFromHash`, `loadCommands`, `saveDesign`, `listDesigns`, `deleteDesign`. `saveDesign` and `deleteDesign` return `null` when the browser could not store the change.
