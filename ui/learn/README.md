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

- `id` is a kebab-case key from `glossary.ts`. Original set: `orbit`, `payload-capacity`, `delta-v`, `eclipse`, `data-rate`, `downlink`, `duty-cycle`, `reliability`, `power-budget`. Anomaly cards also use `reaction-wheel`, `high-gain-antenna`, `drag`, `safe-mode`, `south-atlantic-anomaly`, `deep-space-network`. The accuracy audit added `rtg`, `solar-flux`, and `coverage`.

## Provenance

These sentences are teaching copy. The numbers they quote are the ones the sim already uses (`sim/design.ts`: Mars sunlight about 43%, low-Earth coverage about 80%, geostationary about 42%). Sources for the claims a judge can check:

| Term | What the glossary says | Source already in the repo |
| --- | --- | --- |
| Deep Space Network | Three sites; a launch or landing can take the antenna | [NASA DSN](https://www.nasa.gov/directorates/somd/space-communications-navigation-program/what-is-the-deep-space-network/) and [NASA OIG IG-23-016](https://oig.nasa.gov/wp-content/uploads/2023/12/ig-23-016.pdf) (the cited example is launches). Same links as the `station-bumped` card. |
| Reaction wheel | One failure can force coarse pointing; it does not always | [Kepler](https://science.nasa.gov/mission/kepler/) lost two of four wheels and continued as K2. Same story as the reaction-wheel card. |
| RTG | Heat from plutonium, works in the dark and far from the Sun | [NASA MMRTG fact sheet](https://science.nasa.gov/wp-content/uploads/2024/02/mmrtg-factsheet-updated-5-18-20-1.pdf), also cited from `ui/scene3d/parts/REFERENCES.md`. |
| Solar flux | Mars sunlight is about 43% of Earth's | Inverse-square of Mars's distance, as in `docs/game-design/ACCURACY_AUDIT.md`. Planet distances: [NASA Mars fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html). |
| Coverage | Share of the planet the orbit flies over | Game rule in `sim/design.ts` (`coverage_fraction`), not a separate NASA table. |
- The same id may appear twice on one screen. Each `<Term>` gets its own tooltip id, so the HTML stays valid.
- With no children, the button label is the glossary term. With children, those are the visible words and the tooltip still uses the glossary meaning.
- Unknown ids render the children (or the raw id) and do not show a tooltip.
- Hover or keyboard-focus the word. The tooltip uses `--game-*` tokens from `ui/theme/` when that CSS is loaded.
- Tooltips stay `display: none` until shown, so hidden definitions do not widen the page. Near the right edge they anchor on the trigger’s right side (`learn-term-tip--end`).

`ui/briefing` still has a short local `KEY_TERMS` list. Once this folder is on your branch, that list can point at these ids instead of duplicating sentences.
