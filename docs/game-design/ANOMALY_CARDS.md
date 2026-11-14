# Anomaly cards: the deck

Owner: claude@sarah (content). The sim encoding is claude@ethan's (`sim/`). See [`GAME_DESIGN.md`](GAME_DESIGN.md) §4.2 for how cards are drawn and resolved.

## Rules for every card

- **Two options, no single right answer:** a certain, smaller loss vs. a gamble. Where possible, **your design changes the odds** (battery, altitude, ground stations, bus reliability), so earlier choices pay off or hurt.
- **Conditions use the real catalog columns** from `sim/README.md` on `ethan-claude/sim-data` (e.g. `altitude_km`, `type`, `capacity_wh`, `data_rate_bps`, `reliability`). `bus_reliability_factor` = the chosen bus's `reliability` ÷ the best bus's `reliability` in the catalog.
- **Effects only use the sim's vocabulary:** `lose_days(n)`, `science_rate_mult(x)`, `downlink_mult(x)`, `storage_mult(x)`, `lose_stored_data()`, `cost_usd(n)`, `chance(p, then, else)`, `end_mission(reason)`. Add `for_days: n` when an effect is temporary. Without it, the effect lasts for the rest of the mission.
- **The story is true.** Mission, year and what happened are checked facts. **Odds and costs are game balance**, so the card says "based on", never "this is what would happen".
- **`source_url` must be filled before the card ships.** Use a NASA (or other agency) page about the event. TODO entries below say what to search for. A card with no source either drops its mission name ("Inspired by common spacecraft failures") or stays out of the deck.
- **Body text:** at most 2 short sentences, written for a 12-year-old. Option labels ≤ 8 words. Effect text is plain words, not numbers alone.

Numbers below are starting values for balance. claude@ethan may tune them. Keep the *direction* of each trade.

---

### 1. `reaction-wheel`: reaction wheel failure

- **Console:** SPACECRAFT · **When:** operations, any body, mission day ≥ 30
- **Body:** One of the spinning wheels that points your spacecraft has stopped. You can't hold your instruments steady on targets.
- **A. Switch to coarse pointing:** `science_rate_mult(0.6)`. *"Science −40% from now on. No risk."*
- **B. Try to restart the wheel:** `chance(0.6 × bus_reliability_factor, [], [lose_days(5), science_rate_mult(0.6)])`. *"Good chance it's fixed. If not, 5 days in safe mode and coarse pointing anyway."*
- **Story (Kepler, 2013):** NASA's Kepler planet-hunting telescope lost the second of its four reaction wheels and could no longer point precisely. Engineers balanced it using the pressure of sunlight and flew a new mission, K2, for years more.
- **Lesson:** spare parts and clever operations save missions. More reliable buses carry redundancy.
- **source_url:** https://science.nasa.gov/mission/kepler/

### 2. `antenna-stuck`: high-gain antenna won't open

- **Console:** COMMS · **When:** operations, mission day 1–10, chosen `comms` part is not the slowest in the catalog (`data_rate_bps`)
- **Body:** Your main dish antenna is stuck half open. You can still talk through the small backup antenna, but it's far slower.
- **A. Use the backup antenna and compress data:** `downlink_mult(0.25)`. *"Downlink drops to a quarter. Safe."*
- **B. Keep pulsing the deploy motor:** `chance(0.3, [], [lose_days(3), downlink_mult(0.25)])`. *"Small chance it pops open. If not, 3 lost days and the backup anyway."*
- **Story (Galileo, 1991):** Galileo's high-gain antenna jammed partly open on the way to Jupiter. The team pulsed its motor thousands of times without success, then rewrote the software to compress data and sent it home through the small low-gain antenna, and still returned most of the planned science.
- **Lesson:** downlink is the bottleneck. Science only counts when the data gets home.
- **source_url:** https://science.nasa.gov/mission/galileo/ · motor pulses (over 13,000): https://descanso.jpl.nasa.gov/DPSummary/Descanso5--Galileo_new.pdf

### 3. `geomagnetic-storm`: solar storm swells the atmosphere

- **Console:** PLAN · **When:** operations, body = earth, orbit `altitude_km` < 1,000
- **Body:** A burst from the Sun is heating Earth's upper atmosphere, and it puffs up. More air at your altitude means more drag pulling you down.
- **A. Go to safe mode, edge-on to the wind:** `lose_days(2)`. *"Lose 2 days of science. Drag mostly avoided."*
- **B. Keep observing:** `chance(p_lowalt, [end_mission("reentry")], [])`, where `p_lowalt` = 0.25 below 400 km, 0.08 at 400–600 km, 0.01 above. *"Fine if you're high enough. Very risky in a low orbit."*
- **Story (Starlink, 2022):** In February 2022, a geomagnetic storm raised drag on a batch of 49 newly launched Starlink satellites still in a very low orbit. 38 of them couldn't climb away and re-entered the atmosphere.
- **Lesson:** low orbits are cheaper to reach and see more detail, but drag and space weather shorten their lives.
- **source_url:** https://repository.library.noaa.gov/view/noaa/53091 (NOAA space-weather study of the February 2022 Starlink loss)

### 4. `memory-fault`: on-board memory errors

- **Console:** SCIENCE · **When:** operations, any body, `data_stored_gb` > 0
- **Body:** Your spacecraft's computer keeps rebooting because its data storage is corrupted.
- **A. Wipe and reformat the storage:** `lose_stored_data(), lose_days(1)`. *"Lose everything not yet sent home, and 1 day."*
- **B. Keep running on half the memory:** `storage_mult(0.5)`. *"Keep your data, but storage is half the size from now on."*
- **Story (Spirit rover, 2004):** Two weeks after landing on Mars, NASA's Spirit rover got stuck rebooting because of a problem with its flash memory. Engineers diagnosed it from Earth and fixed it by reformatting the memory, and Spirit went on to drive for years.
- **Lesson:** storage and downlink work together. Data on board isn't science yet.
- **source_url:** https://www.jpl.nasa.gov/news/mars-rover-spirit-restored-to-health/

### 5. `dust-storm`: planet-wide dust storm

- **Console:** SPACECRAFT · **When:** operations, body = mars, chosen `solar` part has `type: solar` (an `rtg` is immune)
- **Body:** A dust storm is wrapping the whole planet, and sunlight on your solar panels is falling fast.
- **A. Hibernate until it clears:** `lose_days(12)`. *"Lose 12 days. The spacecraft survives."*
- **B. Keep working on battery:** `chance(p_battery, [end_mission("power_loss")], [science_rate_mult(0.8, for_days: 12)])`, where `p_battery` = 0.5 with no battery or the smallest `capacity_wh`, 0.2 with a mid-size one, 0.05 with the largest. *"Bigger battery, better odds."*
- **Story (Opportunity rover, 2018):** A global dust storm on Mars blocked the sunlight that powered NASA's Opportunity rover. It went silent in June 2018 and never woke up, after nearly 15 years of driving. Curiosity, powered by a nuclear generator instead of solar panels, kept working through the same storm.
- **Lesson:** power source choice matters, and battery margin is insurance.
- **source_url:** https://science.nasa.gov/missions/mer/nasas-opportunity-rover-mission-on-mars-comes-to-end/

### 6. `lost-contact`: spacecraft goes silent

- **Console:** COMMS · **When:** operations, any body, mission day ≥ 20
- **Body:** Your spacecraft stopped answering after a routine command. It might be spinning out of control, or just pointed the wrong way.
- **A. Pay for extra antenna time to search:** `cost_usd(0.03 × budget_usd), lose_days(6)`. *"Costs 3% of your budget and 6 days, but you'll find it."*
- **B. Wait for it to fix itself:** `chance(0.55 × bus_reliability_factor, [lose_days(15)], [end_mission("lost_contact")])`. *"Free, but you might lose it for good."*
- **Story (SOHO, 1998):** The Sun-watching SOHO observatory (ESA and NASA) lost contact in June 1998 after a command error sent it spinning. Teams found it by bouncing radar signals off it, slowly brought it back, and resumed science later that year. It was still observing 30 years after launch.
- **Lesson:** ground stations are part of the mission, not just the spacecraft.
- **source_url:** https://www.esa.int/Newsroom/Press_Releases/SOHO_spacecraft_located_with_ground-based_radar · https://soho.nascom.nasa.gov/operations/Recovery/recovery_diary.html

### 7. `radiation-zone`: radiation hits in the South Atlantic Anomaly

- **Console:** SPACECRAFT · **When:** operations, body = earth, orbit `altitude_km` < 2,000 (the sim's orbit `radiation_factor` can scale the odds)
- **Body:** Every few orbits you pass through a patch of strong radiation over the South Atlantic, and your instruments are glitching.
- **A. Pause science on every pass:** `science_rate_mult(0.9)`. *"About 10% less science from now on."*
- **B. Keep observing through it:** `chance(0.35, [lose_days(3)], [])`. *"Usually fine. Sometimes a reboot costs 3 days."*
- **Story (inspired by Hubble and many LEO satellites):** Earth's radiation belts dip closest to the surface over the South Atlantic. Hubble and many other satellites in low orbit routinely pause sensitive work while passing through it.
- **Lesson:** orbit choice decides your radiation environment.
- **source_url:** https://www.nasa.gov/missions/icon/nasa-researchers-track-slowly-splitting-dent-in-earths-magnetic-field/ · Hubble: https://hst-docs.stsci.edu/archives/hspcycle30/the-hubble-space-telescope-primer-for-cycle-30/hst-primer-orbital-constraints

### 8. `station-bumped`: ground station time bumped

- **Console:** COMMS · **When:** operations, any body
- **Body:** A higher-priority mission needs the big antennas this week, and you're losing most of your passes.
- **A. Rent time on commercial ground stations:** `cost_usd(0.02 × budget_usd)`. *"Costs 2% of your budget. No data delay."*
- **B. Wait it out:** `downlink_mult(0.4, for_days: 7)`. *"Free, but data piles up. Watch your storage."*
- **Story (inspired by the Deep Space Network):** NASA's Deep Space Network has only three sites, in California, Spain and Australia, shared by dozens of missions. Antenna time is scheduled in advance, and high-priority events like launches can take precedence.
- **Lesson:** downlink capacity is a shared, scheduled resource.
- **source_url:** https://www.nasa.gov/directorates/somd/space-communications-navigation-program/what-is-the-deep-space-network/ · scheduling and priority: https://oig.nasa.gov/wp-content/uploads/2023/12/ig-23-016.pdf

---

## Flavour for the GO / NO-GO poll (not cards)

When a NO-GO is about units or mass margin, CAPCOM may add one line of real history:

- **Mars Climate Orbiter (1999):** lost because one team's software used imperial units and another expected metric. *"Double-check your units, Flight."* (source_url: https://www.jpl.nasa.gov/news/mars-climate-orbiter-team-finds-likely-cause-of-loss/)

## Ideas for more cards (need research before adding)

Solar array that only half deploys, a stuck instrument cover, propellant leak, a launch delay that pushes into a worse window, an instrument that outperforms (a good-news card), a micrometeoroid hit.
