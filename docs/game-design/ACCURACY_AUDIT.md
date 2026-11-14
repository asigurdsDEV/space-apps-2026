# Accuracy, requirements and awards audit

By claude@sarah for Sarah, 2026-11-14 18:45, against `main` after claude@ethan's merge batch (405 tests pass, build OK). Every finding that needs work is a task on `.agents/BOARD.md` → Open → "Accuracy audit + awards push", with an owner.

**Verdict:** the game is in good shape scientifically. Orbits, the radio and power rules, the real missions, the real space weather and the anomaly stories hold up. There is **one real physics error** (solar power at Mars), **two data errors**, **one visible 3D bug**, **five brief items missing or thin**, and **the submission docs break the official demo rules and undersell our NASA data**. That last one costs the most points, and it's the cheapest to fix.

---

## 1. Science and data accuracy

### Checked and correct

| Area | What I checked | Result |
|---|---|---|
| Orbits (`data/catalogs/orbits.json`) | ISS-like 400 km, 51.6°, 92.5 min · SSO 600 km, 97.8°, 96.7 min · GEO 35,786 km, one sidereal day (86,164 s), sees ~42% of Earth, eclipses only near equinoxes (~1% a year) · low lunar 100 km, ~118 min · low Mars 400 km, 7,080 s (I recomputed 7,084 s from Mars's μ = 4.2828×10¹³ m³/s²), 93°, ~7-month cruise, ~1 km/s capture burn | ✓ all within normal teaching precision |
| Radio range rule (`sim/design.ts`) | Data rate scales with (reference range / distance)², the inverse-square law for a fixed radio and antenna. Mars HGA: ~4 Mbps at the mean Earth–Mars distance, in line with real Mars orbiters (MRO: up to ~6 Mbps) | ✓ |
| Power rules | Average solar power = panel × sunlit share. Battery must cover power × eclipse share × period. RTG ignores eclipse. Linear yearly degradation | ✓ (but see the Mars error below) |
| Mass and launch rules | Mass is checked against the launcher's capacity column for the chosen orbit, and delta-v against the bus engine | ✓ matches the brief's "check that mass and orbit are compatible with the launcher" |
| Launch vehicles | Electron ~300 kg LEO, ~$7.5M, CAPSTONE-class lunar · Pegasus XL ~450 kg LEO · Falcon 9 17.5 t LEO (reusable), 5.5 t GTO · SLS Block 1 95 t LEO, 27 t TLI, ~$2B · rideshare ~$6k/kg | ✓ except the Falcon 9 lunar/Mars pair below |
| Power parts | MMRTG 45 kg, ~110 W, ~4%/yr decline · CubeSat body cells ~7 W, small battery 40 Wh | ✓ |
| Real missions (`data/real-missions.json`) | IceCube (3U, 883 GHz cloud ice), Terra (5 instruments, 1999), GOES-16 (2016), Lunar Prospector (1998, spin-stabilised, polar water hints), LADEE (deliberate far-side impact), GRAIL twins, CAPSTONE (12U, halo orbit), MAVEN, MRO (radar + big dish), Odyssey (polar ice), MarCO (first deep-space CubeSats) | ✓ one mass to verify (LRO) |
| Space weather (`data/space-weather/`, NASA SPDF OMNI) | Halloween 2003 G5 / Kp 9 / Dst −383 nT · 10–11 May 2024 G5 · 3 Feb 2022 G1 (the Starlink storm) · June 2019 quiet. NOAA G-scale rounding matches SWPC's | ✓ tested in `space-weather.test.ts` |
| Anomaly cards | All 8 stories checked by claude@aiden against NASA/JPL/ESA/NOAA/STScI pages (PR #28), plus three wording fixes (Starlink 38 of 49, SOHO 30 years, DSN launches) | ✓ |
| CAPCOM story | No historical claims except the Earth–Mars delay, now sourced (NASA: ~4–20 min one way) | ✓ |
| Glossary (`ui/learn`) | All 15 definitions are correct and in plain language. "97% → about 1 in 33 fails" is right | ✓ one wording nit |

### Errors found → tasks

| # | Finding | Why it matters | Fix (owner) |
|---|---|---|---|
| S1 | **Solar arrays give full power at Mars.** Mars is 1.524 AU from the Sun and gets 1/1.524² ≈ **43%** of Earth's sunlight (~590 vs 1,361 W/m²). | A judge who knows space will catch it. Fixing it also teaches a real trade: solar vs RTG at Mars (why Curiosity and Perseverance use RTGs). | Orbit column `solar_flux_factor` (Earth/Moon 1.0, Mars 0.43) (claude@jamie) and multiply solar output in the sim (claude@ethan / claude@aiden). Re-check the Mars reference design still wins. |
| S2 | **Falcon 9 lifts more to Mars (4,000 kg) than to the Moon (3,500 kg).** Trans-lunar injection needs less energy than trans-Mars, so TLI capacity must be larger. SpaceX lists ~4,020 kg to Mars (expendable), so the TLI value is the one that's low. | Physically impossible ordering. | Raise `payload_tli_kg` above TMI (claude@jamie). |
| S3 | **3U CubeSat totals 4.5 kg** (3 dry + 1.5 added). The CubeSat standard caps a 3U at 4.0 kg. | Real standard in the brief's own CubeSat 101 resource. | `max_added_mass_kg` 1.0 (claude@jamie). |
| S4 | **LRO launch mass 1,846 kg:** most references give **1,916 kg**. | Small, but it's shown to players. | Verify against the row's source (claude@jamie). |
| S5 | Glossary says DSN priority goes to events "such as a landing". The card was corrected to "launches" to match its source. | Consistency. | "such as a launch or landing" (cursor@kaipo). |

Labelled approximations are fine and honest. The catalog `source` fields say "hand-tuned for gameplay", and the 3D caption says "altitude not to scale". Keep those labels.

## 2. 3D models and visuals

Checked in `ui/scene3d/preview.html`:

- ✓ **6U CubeSat** is drawn as 2 × 3 units with deployable wings. **Medium bus + MMRTG** shows the finned RTG on the aft end and a dish, which is how a real MMRTG looks. **Lunar** close-up: grey cratered ground. **GEO**: correct, with Earth far away.
- ✗ **Bug (P0): a medium or flagship bus in LEO/SSO renders almost entirely white** in spacecraft mode. The camera seems to sit inside the atmosphere glow. Reproduced twice; GEO and the Moon are fine. This is the builder's hero view, so judges will see it (claude@ethan).
- ✗ A **rocket nozzle** is drawn on the 3U/6U, which have no propulsion (`propulsion_delta_v_ms: 0`). Draw it only when delta-v > 0 (claude@ethan, P2).
- ✓ The flight-training GLBs (cursor@kaipo's V3 pack) are simple markers, and the manifest honestly says "classroom-scale markers, not true-size".
- ✓ Orbit ring altitude is log-scaled and labelled "not to scale" with the real altitude in the caption. That's fine for teaching.

## 3. The brief, requirement by requirement

✓ = done and on main · ◐ = partly · ✗ = missing → task

| Brief item | Status | Where / task |
|---|---|---|
| Functional game, clear UI | ✓ | Live: Start → Briefing → Build → GO/NO-GO → Launch → Fly → Results |
| Single player + team up to 4 | ✓ | Solo, Host/Join online (PeerJS), roles own parameters (`shared/net.ts`) |
| Roles: planning, spacecraft, science, comms/resources | ✓ | 4 consoles |
| Negotiate competing priorities; result depends on coordination | ◐ | Roles split the controls, but nothing rewards negotiation. **Team priorities on the debrief (claude@sarah, this PR) + priorities on the poll (claude@jamie)** |
| Define the objective first; requirements | ✓ | Start mission picker + Briefing (budget, science goal, length, bonus star) |
| Every decision has a consequence | ✓ | Live budget bars, issues, GO/NO-GO, what-if reruns |
| No single right answer | ✓ | what-if shows several fixes; many designs win |
| Realistic constraints (budget, mass, power, comms, lifetime) | ✓ | All in the sim |
| Components: structure, power, batteries, comms, **onboard computer, attitude control**, instruments | ◐ | Computer + attitude control aren't named anywhere. **Say it in bus descriptions (claude@jamie)** |
| Instruments with mass/power/cost/data/science | ✓ | 11 instruments |
| Simple vs advanced components by difficulty | ✗ | P2: part `tier` (in decision 004). Not assigned yet, take it if there's time |
| Several orbits, explain characteristics | ✓ | 5 orbits + glossary + descriptions |
| Orbit affects coverage, observation, comms, lifetime | ◐ | Comms, eclipse and lifetime yes. **Coverage is ignored → sim task** |
| Launcher capacity/cost/orbits + compatibility check | ✓ | `orbit_unreachable`, `mass_over_limit` |
| Display main resources clearly | ✓ | Builder budget bars, run view |
| **Time: development** + lifetime | ◐ | Lifetime yes. **No parts have build time and no scenario has a deadline → data task** |
| Plain-language teaching, tutorials, visual indicators | ✓ | Glossary tooltips, builder tour, CAPCOM, fact pop-outs, anomaly stories |
| Teach *why*, not just right/wrong | ✓ | Issue messages say how to fix, debrief "why" + what-if |
| Multiple scenarios | ✓ | First Light, Moon Mapper, Red Planet Radar |
| Random events | ✓ | Anomaly cards + real space-weather storms |
| Difficulty levels | ✓ | Easy / Normal / Hard |
| Spacecraft visualization | ✓ | 3D builder + fly view (fix the white-out bug) |
| Real-time dashboard | ✓ | Run view progress + data + weather strip |
| Leaderboards | ✓ | Local leaderboard + daily mission |
| Mission report | ✓ | Debrief: grade, stars, why, numbers, what-if, real-mission match, share |
| Save, share, compare designs | ✓ | `ui/share` |
| Co-op for 4 | ✓ | Rehearsal on venue wifi still to run (cursor@kaipo) |
| Competitive: teams solve the same objective | ✓ | Daily mission: same seed for everyone + leaderboard |
| **Sandbox mode** | ✗ | **4th scenario "Sandbox" (claude@jamie)** |
| Post-mission "why it failed" | ✓ | Debrief + what-if |

## 4. Awards: where we can win, and what moves the needle

Judges score each project 1–5 on **Impact, Creativity, Validity, Relevance (NASA data must be *integral*), Presentation**. Ten global awards; ours to aim for, best fit first:

| Award | Why we fit | What to do before submission |
|---|---|---|
| **Best Use of Data** ("makes space data accessible or leverages it for a unique application") | Real NASA OMNI space weather drives in-game storms on the days they happened. 12 sourced real missions. Real anomaly histories | **Say it in the submission and the 30-s video** (both currently say we use *no* NASA dataset). Source-link check |
| **Best Use of Science** ("most valid use of science") | Real orbital periods, inverse-square radio, eclipse/battery, launcher capacity per orbit, NOAA storm scale | **Fix S1–S4** so nothing is wrong when a scientist plays |
| **Best Mission Concept** ("most plausible concept and design") | The player goes through a real mission design flow: objective → requirements → design → review (GO/NO-GO) → launch → ops → debrief | Fix the 3D white-out. Add sandbox + development time so the whole brief is covered |
| **Best Use of Storytelling** ("communicates the potential of open data through storytelling") | CAPCOM story arc, cutscenes, "this storm really happened on 30 Oct 2003" | The 30-s video should *tell a story with the data*: "You launch… a real storm from 2003 hits…" |
| **Art & Technology** | 3D spacecraft built from your parts, cutscenes, rooms, shaders, browser-only | Fix the visual bugs, show the 3D in the first 5 s of the video |
| Most Inspirational / Galactic Impact | Free, browser-only, phone-friendly way for any student to fly a mission | One line in the submission on reach (no install, works offline, co-op) |

**The single highest-value fix is the submission (P0, cursor@caleb + codex@jamie).** The official rules allow **a 30-second video or ≤ 7 slides**. Our plan is a ~3-minute video, and our text says we use no NASA dataset. Suggested 30-second beat sheet:

1. **0–5 s:** 3D spacecraft spinning in the builder. "Design a real space mission in your browser."
2. **5–12 s:** budget bars go red. GO/NO-GO: "COMMS is NO-GO." Fix it, all GO.
3. **12–20 s:** launch cutscene → fly view. Strip: "G5 extreme storm · real NASA data from 30 Oct 2003." Anomaly card based on a real event.
4. **20–27 s:** debrief: grade, "Change one thing: 3 ground stations → 88", "Your mission is most like Lunar Prospector."
5. **27–30 s:** "Up to 4 players. Real NASA data. Kimchi Trenchers." + URL.

Also required: **English subtitles if anyone speaks another language**, **every external resource listed in References**, and **submit before Sun 15 Nov 11:59 pm local**.
