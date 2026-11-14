# Daily missions and saved-record regression

Checked by `codex@aiden`, 2026-11-14, against the live [Pages game](https://asigurdsdev.github.io/space-apps-2026/).

Result: the tested Daily/regular record integration passes. A lower Daily result after two reloads preserves the earlier score, stars and matching design. No production source changes were needed.

## Revision and checks

- Local revision: `de0d869` (claim commit on source from `309dd31`).
- Live entry script: `/space-apps-2026/assets/index-Df1Hs8x_.js`, matching the local production build. This identifies the tested bundle even if coordination commits deploy during the check.
- `npm test`: 316 tests pass across 30 files.
- `npm run build`: typecheck and production build pass. Entry script 352.62 kB / 113.01 kB gzip; lazy 3D chunk 616.41 kB / 153.86 kB gzip.
- Existing build warnings remain: lazy 3D chunk over 500 kB, and extensionless PWA imports incompatible with Vite's proposed future native config loader. Neither failed this build; config/3D remain with their owners.
- Browser console error log was empty at inspection after both reloads.

## Live runs, in order

Today's descriptor was **2026-11-14 UTC, Moon Mapper, Normal**. The date helper derives seed `20261114`; this check did not change the browser clock or inspect/mutate application storage directly.

| Run | Entry and design | Observed result | Saved record |
|---|---|---|---|
| 1 | Set the ordinary difficulty picker to **Hard**, then press **Play daily mission**. Use the winning design below. | Daily briefing still has Normal's $300M budget, 75-point science goal and two-year duration. GO/NO-GO appears. At 60×, the mission ends after 730 days with 82.4 science, **100 points / A / 3 stars**. Share text includes `Daily 2026-11-14`. | **Your daily mission record**, 100 points, 3/3 stars, saved in this browser. |
| 2 | Reload. Start **regular Moon Mapper / Normal**. Change only the bus to Medium spacecraft. | At 60×, science goal missed: 44.7/75 science, **69 points / C / 0 stars**, 730 days. Share text has no Daily label. | **Your mission record**, 69 points, 0/3 stars. It does not show the Daily run's 100 points. Saved design has only the laser altimeter and the deep-space transponder. |
| 3 | Reload again. Start today's **Daily** mission. Change only the bus to Medium spacecraft. | Same lower design: **69 points / C / 0 stars**, 44.7/75 science, 730 days. Share text includes `Daily 2026-11-14`. | **Your daily mission record** still has **100 points / 3 stars**. Expanding **View saved design** still shows the winning design's three instruments and high-gain dish, rather than this run's one instrument and transponder. |

Both Daily launches showed the same initial weather date, **1998-02-05**. The regular launch showed **2017-09-20**, consistent with the app using the Daily seed separately from the regular scenario seed. This is an observable consistency check, not a full RNG-state inspection.

### Winning Daily design

Start from Moon Mapper's default parts and change:

- Bus: **Medium spacecraft** (`medium-bus`).
- Instruments: keep **Laser altimeter**, add **Radiation detector** and **Infrared spectrometer**.
- Radio: **High-gain dish antenna** (`high-gain-dish`).

Keep Low lunar orbit, Falcon 9, Medium solar array and Medium battery. Cost is $237.6M, leaving $62.4M from the $300M budget, so the budget bonus is earned. The poll correctly permits launch with the radio range warning visible as a concern.

The lower design changes only the default bus to Medium spacecraft. It keeps just the laser altimeter and the default deep-space transponder. Cost is $239.5M; missing the science goal prevents the budget bonus from being awarded.

## Record layout

With the retained winning design expanded, a 390×844 viewport override produced a 375 px page client width (vertical scrollbar present): page scroll width 375 px, record client/scroll width 341/341 px, expanded design 293/293 px. No horizontal overflow was measured. The visible record panel showed 100 points and 3/3 stars beneath the current 69-point result. The viewport override was reset afterward.

## Limits and remaining ownership

- No Daily/stars/record defect was found in these runs. The distinction between the current run and the saved best is working as intended.
- This exercises one UTC day and one scenario. Other-day key isolation, ties, malformed records, blocked storage, legacy records and UTC calendar boundaries are covered by existing unit tests, not newly exercised browser cases here.
- The live UTC-midnight refresh/focus timer, exact RNG state, simultaneous tabs, offline behavior and four-device co-op were not checked. No existing records were cleared.
- Scroll/focus and error-boundary recovery belong to Claude Aiden's active app-safety work and were not part of this revision's check. This report does not certify those changes, future app changes, Caleb's full accessibility pass or Kaipo's venue rehearsal.
- Stars in this record belong to its best-score design. Independent program progression/max-star unlocks remain outside this component.
