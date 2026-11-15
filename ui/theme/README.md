# Shared theme

CSS only, with no dependencies. Import once from the app entry:

```ts
import '../ui/theme/theme.css'
```

Add `game-theme` to the app wrapper. Leave `data-theme` unset to follow the device preference, or set `data-theme="light"` / `data-theme="dark"` on `<html>` to choose a mode. Individual preview containers can also set the attribute. No preference is saved by this package.

```tsx
<main className="game-theme">
  <section className="game-panel">
    <h1>First Light</h1>
    <p className="game-muted">Balance science with your available resources.</p>
    <button className="game-button game-button--primary" onClick={onContinue}>
      Start designing
    </button>
  </section>
</main>
```

## Tokens

| Token | Use |
| --- | --- |
| `--game-bg`, `--game-panel`, `--game-surface` | Page, cards, inset surfaces |
| `--game-text`, `--game-muted` | Body and secondary text |
| `--game-border` | Outlines of controls (buttons, inputs): 3:1 against the page |
| `--game-line` | Hairline for panels and dividers (white at 14 %) |
| `--game-glass`, `--game-glass-blur` | Background and `backdrop-filter` of a panel laid over the 3D game |
| `--game-accent`, `--game-on-accent`, `--game-selected` | Actions, text on primary actions, selected backgrounds |
| `--game-success`, `--game-warning`, `--game-danger` | Resource and mission feedback, always accompanied by text |
| `--game-focus` | Keyboard focus outline |
| `--game-font`, `--game-font-mono`, `--game-font-display` | Inter Tight for everything (index.html links it from Google Fonts; a system sans is the fallback). Numbers that line up use `font-variant-numeric: tabular-nums` |
| `--game-space-1/2/3/4/6/8` | 4/8/12/16/24/32px spacing at a 16px root |
| `--game-radius`, `--game-radius-control` | Panels and controls |

Optional classes: `game-panel`, `game-button` (plus `game-button--primary`), `game-field` (input/select/textarea), `game-muted`, `game-eyebrow`, `game-stat`, `game-success`, `game-warning`, `game-danger`.

Base element rules are scoped to `.game-theme`. Only tokens and `color-scheme` apply globally. The package does not alter existing screen layouts or overwrite their private variables. Existing screens must replace local color literals with the shared tokens to adopt both modes; merely importing the CSS will not recolor them completely.

## Adoption by current owners

- **app/ (claude@ethan):** import CSS once, wrap the game with `game-theme`. The package supplies no screen routing or theme toggle.
- **Builder/briefing (claude@aiden):** map `--mb-bg/panel/text/muted/line/accent/pick/ok/bad/warn` to the corresponding `--game-bg/panel/text/muted/border/accent/selected/success/danger/warning` tokens (for example, `--mb-bg: var(--game-bg)`) and remove local color-scheme palettes. Primary buttons must use `--game-on-accent` for text, since the dark accent is pale blue.
- **Mission/results (claude@sarah):** map `--mv-bg/card/line/text/muted/info/good/warn/bad` to `--game-bg/panel/border/text/muted/accent/success/warning/danger`. Replace white text on accent buttons/phases with `--game-on-accent`. Keep the distinct Earth/Moon/Mars illustration colors and screen layout.
- **Start/lobby (codex@jamie):** start already uses `--game-bg/panel/text`. Map the remaining literal colors to the tokens, especially inputs, selected modes and button text.

All screen source remains with its owner. No shared data contract changes are needed.

## Preview and checks

Serve the repo root (or use Vite after the scaffold merges), then open `/ui/theme/preview.html`. It shows forced dark and light examples side by side, stacks on phones, includes disabled controls and keyboard focus, and follows the OS theme on the outer page. Use browser device/theme emulation to check the automatic root preference and an explicit `<html data-theme>` override.

Run `node ui/theme/check-contrast.mjs` from the repo root to check both palettes, status/text colors, primary button labels, control borders and focus outlines. It needs only Node, so it works before the scaffold merges.

The look is the start menu's (ui/start): near-black, white and grey, square corners, hairlines; green, amber and red only say GO, caution and NO-GO. Every button is a small tracked label; the main action (`*primary*` classes, submit buttons) is white with dark text.

Enabled controls are at least 44px tall. Focus outlines are 2px and white. Text/status colors target WCAG AA contrast against page and panel backgrounds. Reduced-motion preference disables animations and transitions inside `.game-theme`. The illustrative resource values in the preview are not simulation output.
