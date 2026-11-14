# Launch vehicle references

Every rocket in `fleet.ts` is a procedural model of a real vehicle NASA has flown missions on. No model
files, textures, logos or trademarks are used: shapes and paint schemes only.

How each number was checked (column "How"):

- **read**: the page was fetched while building the models and the number was read from it.
- **search**: the number was seen in a search-result summary of that page; the page itself could not be read by machine (PDF, script-only page or a 403 to automated clients).
- **brief**: the number comes from the task brief and widely published figures; the operator page is cited, but it could not be read by machine.
- **eye**: no published drawing was used. The part was sized by eye against the overall dimensions and public photos, and is not authoritative.

## The vehicles

Overall dimensions live in `vehicles.ts` (`KNOWN`). "Stack" is first stage + interstage + visible upper stage + fairing, in meters; it adds up to the height.

| id | Real vehicle | Height and stack (m) | Body and fairing (m) | Engines and strap-ons | NASA missions | Sources |
|---|---|---|---|---|---|---|
| `falcon-9` | SpaceX Falcon 9 Block 5 | 70.0 = 41.2 + 6.5 + 9.2 + 13.1 | 3.66 body; 5.2 x 13.1 fairing | 9 Merlin 1D in an octaweb, 1 Merlin Vacuum; 4 landing legs, 4 grid fins; black interstage | TESS, DART, SWOT, PACE | [1] [2] [3] |
| `rideshare` | Falcon 9 on a Transporter-style shared launch | same as `falcon-9` | same | same rocket, flown on a sooty reused booster; dispenser stack of small satellites under the fairing | CubeSat Launch Initiative (ELaNa) CubeSats | [1] [4] |
| `falcon-heavy` | SpaceX Falcon Heavy, as flown for Psyche | 70.0, same stack as Falcon 9 | 12.2 wide: three 3.66 cores; side cores 47 with nose cones | 27 Merlin 1D; side cores have legs and fins and fly back, centre core is bare and expended | Psyche, Europa Clipper | [5] [6] [7] |
| `electron` | Rocket Lab Electron | 18.0 = 11.0 + 1.4 + 3.1 + 2.5 | 1.2 carbon-composite body and fairing | 9 Rutherford, 1 vacuum Rutherford, Curie kick stage | CAPSTONE, TROPICS | [8] [9] |
| `pegasus-xl` | Northrop Grumman Pegasus XL | 16.9 = 9.0 + 0.9 + 2.6 + 4.4 | 1.27 body; 6.7 wing span | three solid stages (the third rides inside the fairing); delta wing, three fins; dropped from the L-1011 "Stargazer" at 39,000 ft (about 12 km) | NuSTAR, IRIS, ICON | [10] |
| `vulcan-centaur` | ULA Vulcan Centaur VC6 | 61.6 = 33.3 + 3.6 + 9.2 + 15.5 | 5.4 body and fairing; 15.5 standard fairing | 2 BE-4; six GEM 63XL solids, 21.9 x 1.6; Centaur V with 2 RL10C | Peregrine Mission One (NASA CLPS payloads) | [11] [12] |
| `atlas-v` | ULA Atlas V 401 | 58.3 = 32.5 + 3.8 + 9.1 + 12.9 | 3.81 booster; 3.05 Centaur; 4.2 x 12.9 fairing | one RD-180 (two thrust chambers, so two bells); single-engine Centaur; no solids on a 401 | MAVEN, LRO (401); OSIRIS-REx (411); Curiosity (541) | [13] [14] |
| `delta-iv-heavy` | ULA Delta IV Heavy | 71.9 = 36.6 + 4.2 + 12.0 + 19.1 | three 5.1 common booster cores, 40.8 long with nose cone or interstage; 5 m fairing | 3 RS-68A, one per core; RL10B-2 upper stage | Parker Solar Probe | [15] [16] [17] |
| `sls-block-1` | NASA Space Launch System Block 1 with Orion, as flown on Artemis I | 98.0 = 64.6 + 8.4 + 6.0 + 19.0 | 8.4 core; adapter cone 8.4 to 5.0; 5.1 ICPS; 5.0 Orion | 4 RS-25; two five-segment solid boosters 54 x 3.7; ICPS with one RL10; launch abort system 13.4 tall | Artemis I | [18] [19] [20] [21] |

Notes on the choices:

- **Atlas V height.** NASA's Atlas V 401 page [13] gives 57.3 m (188 ft), which is the 401 with the short 12.0 m fairing. The brief's 58.3 m is the same rocket with the 12.9 m extended fairing; the model uses that. The fairing lengths (12.0, 12.9, 13.8 m) are from ULA's Atlas V user's guide and were not read by machine: **brief**.
- **Atlas V variant.** `atlas-v` is the 401 (no solids, 4 m fairing): MAVEN and LRO flew it. Curiosity's 541 and OSIRIS-REx's 411 would need solids and, for the 541, the 5 m fairing; they are not modelled.
- **Delta IV Heavy height.** NASA [16] calls the vehicle "170-foot tall" as stacked without the fairing; the model's stack below the fairing is 52.8 m (173 ft). With the 19.1 m fairing it is 71.9 m, the usual "235 ft". The split of 40.8 m into 36.6 m of tank and 4.2 m of interstage is by **eye**.
- **SLS upper part.** `s2` (6.0 m) is the part of the ICPS that shows above the cone (4.5 m) plus the Orion stage adapter (1.5 m). `fairing` (19.0 m) is Orion's place: 5.6 m of service-module panels and a 13.4 m launch abort system. The player's spacecraft sits where Orion would.
- **Falcon Heavy configuration.** Psyche's side boosters landed [6]; that the centre core flew without legs or grid fins is from launch reporting [7], not a NASA page.
- **Pegasus stack.** Only the 16.9 m length, 1.27 m diameter and 6.7 m span are published figures [10]. The split into stages and the 4.4 m fairing are by **eye**.
- **Mission lists.** Which NASA missions flew on which rocket is from the task brief. Read from a NASA or operator page in this pass: DART [3], CAPSTONE [9], Psyche [6], ICON [10], Parker Solar Probe [15] [16]. The others (TESS, SWOT, PACE, TROPICS, NuSTAR, IRIS, MAVEN, LRO, OSIRIS-REx, Curiosity, Europa Clipper, Artemis I, Peregrine) were not checked.
- **Flight event times** (`events` in `vehicles.ts`) are rounded values of typical flights from launch broadcasts and press kits. They drive only the order and pacing of the shots and were not checked against a source in this pass.

## How each headline number was checked

| Vehicle | Number | How | Source |
|---|---|---|---|
| Falcon 9 | 70 m tall, 3.7 m diameter | search | [2] |
| Falcon 9 | 5.2 m x 13.1 m fairing, 9 Merlin engines, 4 legs, 4 grid fins | brief | [1] |
| Falcon Heavy | 70 m tall, 12.2 m wide, three cores | brief | [5] |
| Falcon Heavy | launched Psyche on 13 Oct 2023 | read | [6] |
| Electron | 18 m (59 ft) tall | search | [9] |
| Electron | 1.2 m diameter, 9 Rutherford engines, carbon composite | brief | [8] |
| Electron | launched CAPSTONE | read | [9] |
| Pegasus XL | 55.4 ft long, 50 in diameter, 22 ft wing span, L-1011 Stargazer, released at 39,000 ft | read | [10] |
| Vulcan Centaur | 2 BE-4, up to six GEM 63XL 71.8 ft long, 2 RL10C, 5.4 m fairing in 15.5 m and 21.3 m lengths | read | [11] |
| Vulcan Centaur | 61.6 m (202 ft) tall, 5.4 m diameter | search | [12] |
| Atlas V | 401 means 4 m fairing, 0 solids, 1 upper-stage engine; 57.3 m with the short fairing | read | [13] |
| Atlas V | RD-180; up to 3 or 5 solids on the 400 and 500 series; 4 m and 5 m fairings in three lengths | read | [14] |
| Atlas V | 3.81 m booster, 3.05 m Centaur, 58.3 m | brief | [14] |
| Delta IV Heavy | three common booster cores, RS-68A, RL10B-2 | read | [15] |
| Delta IV Heavy | RL10B-2 nozzle 84.5 in (2.15 m) across; 5 m fairing | read | [17] |
| Delta IV Heavy | 170 ft without the fairing | read | [16] |
| Delta IV Heavy | 5.1 m cores, 40.8 m long, 19.1 m fairing | brief | [17] |
| SLS Block 1 | 322 ft tall; core 212 ft x 27.6 ft with 4 RS-25; boosters 177 ft x 12 ft, five segments | read | [18] |
| SLS Block 1 | stage adapter 27.5 ft tall, 16.5 ft at the top, 27.5 ft at the bottom | read | [19] |
| SLS Block 1 | ICPS 45 ft (13.7 m) tall, 16.7 ft (5.1 m) diameter, one RL10 | read | [20] |
| SLS Block 1 | launch abort system 44 ft tall, with abort, jettison and attitude-control motors | search | [21] |

## Detail sizes in `fleet.ts`

All of these are **eye** unless a source is given: they were chosen to look right against the overall dimensions above.

| Vehicle | Part | Size used (m) |
|---|---|---|
| Falcon | Merlin 1D bell | 0.92 exit diameter, 1.1 long; ring of eight at 1.3 from the axis plus one in the middle |
| Falcon | Merlin Vacuum bell | 3.0 exit diameter, 3.0 long (it nearly fills the 3.66 m interstage) |
| Falcon | landing legs | 9.6 long, 1.9 wide at the foot, 0.5 at the top |
| Falcon | grid fins | 1.3 x 1.6, folded against the top of the interstage |
| Falcon | fairing | 1.3 flare, barrel to 7.6, rounded ogive above |
| Falcon Heavy | side-core spacing | 4.27 centre to centre: (12.2 - 3.66) / 2, from the 12.2 m width [5] |
| Falcon Heavy | side-core nose | 1.6 black section with the grid fins, 4.2 ogive cone |
| Electron | Rutherford bell | 0.25 exit diameter; ring of eight at 0.42 plus one in the middle |
| Electron | frost bands | lower half of stage 1 and of stage 2, where the liquid-oxygen tanks are taken to be |
| Pegasus XL | wing | 45 degree leading edge, 3.8 root chord, 0.45 tip chord, 6.7 span [10] |
| Pegasus XL | fins | 1.5 span, 1.6 root chord; rudder up, two drooping 23 degrees |
| Vulcan | BE-4 bell | 1.9 exit diameter, 2.3 long |
| Vulcan | GEM 63XL | 1.6 diameter, 19.0 case + 2.9 leaning nose = 21.9 [11]; nozzle 1.24 exit |
| Vulcan | RL10 bells | 1.5 exit diameter |
| Vulcan | paint | white booster, red flame rising from the base on one side, bare steel Centaur V |
| Atlas V | RD-180 bells | two, 1.44 exit diameter, 1.6 apart |
| Atlas V | interstage | 1.0 at 3.81, cone to 3.05 over 1.9, then 0.9 straight |
| Atlas V | fairing | 1.0 boat-tail, barrel to 8.1, cone to a 1.1 cap |
| Atlas V | paint | bronze booster, frost over the upper 55 % (the oxygen tank), white oxygen feed line down the kerosene tank |
| Delta IV Heavy | RS-68A bell | 2.4 exit diameter, 3.2 long |
| Delta IV Heavy | RL10B-2 bell | 2.1 exit diameter [17] |
| Delta IV Heavy | core spacing | 5.35 centre to centre |
| Delta IV Heavy | paint | orange foam, pale engine section (bottom 9 %), darker centerbody band at 60 to 68 % |
| SLS | core sections, from the bottom | engine section to 8.5 %, hydrogen tank to 71.5 %, intertank to 82 %, oxygen tank to 95 %, forward skirt |
| SLS | RS-25 bells | 2.3 exit diameter, 3.1 long, in a square 2.2 from the axis |
| SLS | booster | aft skirt flaring to 5.3 over 2.7, straight to 48.4, cone to the tip at 54; nozzle 3.8 exit |
| SLS | booster position | 6.3 from the core axis, base 3.2 below the core's |
| SLS | feed lines | two 0.6 pipes down the hydrogen tank, plus the systems tunnel |
| SLS | Orion | 5.6 of panels, abort-system cover 5.2 tall, tower to 13.4 [21] |

## Surface detail and effects: by eye

The rendering pass (weld rings, fasteners, doors, markings, engine detail, pad and flight effects) was added from memory of
launch photos and broadcasts. **Nothing in this section was read from a source in that pass**: every row is **eye**. No company
logo, wordmark or NASA insignia is drawn anywhere.

| Where | What was added | What is known to be simplified or uncertain |
|---|---|---|
| Every vehicle | Weld rings between tank barrels, lengthwise panel welds, fastener rows at the joints, access doors, vent slots | Counts, spacing and positions are not from drawings |
| Every vehicle | Light frost on the liquid-oxygen tanks, vapour drifting from two vents before lift-off, frost shedding as it climbs | Vent positions are placeholders: one near the top of each stage |
| Every vehicle | A flickering vapour skirt at the fairing shoulder early in the Max-Q shot | Real vapour cones form near Mach 1, some seconds before Max-Q, and not on every flight |
| Every liquid engine | Bells drawn as a wall of cooling tubes with stiffening bands and heat tint; a glowing throat; on upper-stage engines a chamber, two turbopumps, a duct ring and a gimbal block | One generic powerhead for every engine type. Rutherford (electric pumps) and the RL10 (expander cycle) do not look like this up close |
| Plumes | One narrow jet with shock diamonds per engine inside the cluster's flame; kerosene and solid flames opaque, hydrogen and methane thin; smoke trail by propellant (solid heaviest, hydrogen least) | Diamond spacing and flame lengths are not measured |
| Falcon 9, Falcon Heavy | United States flag near the top of each first stage and on the fairing; cold-gas thruster pods on the interstage; fairing vents; doors above the legs | Flag size and position. The vertical company wordmark the real booster carries is left off on purpose |
| Electron | Section joints, fastener rows, interstage vents | No markings drawn: the real vehicle carries its maker's wordmark and flags, positions not checked |
| Pegasus XL | Fastener rows at the motor joints, a cable duct along the body, doors | No markings drawn: the real lettering runs along the body, which the skin painter does not do |
| Vulcan Centaur | Flag on the booster and on the fairing; welded bands, panel welds and light frost on the bare-steel Centaur V; attach fittings and a cable strip on each GEM 63XL; interstage vents | Flag positions; the Centaur V weld pattern |
| Atlas V | Panel welds on the bronze booster; fastener rows, vents and joints on the interstage; stringers on the Centaur forward adapter; foam grain; flag on the fairing | The two equipment pods at the base of the real booster are not modelled. Flag position |
| Delta IV Heavy | Stringers on the centerbody between the tanks; foam spray passes and closeout seams; fastener rows on the engine section and interstage; flag on the fairing | Whether the centerbody shows ribs through its insulation. The foam charring at ignition that the real vehicle is known for is not drawn |
| SLS Block 1 | Intertank stringers in relief; five hydrogen-tank and two oxygen-tank barrels; doors on the engine section, intertank and forward skirt; on each booster stiffener rings on the aft segment, fastener rows at the field joints, a systems tunnel and black-and-white tracking targets | Target positions and size. The boosters' red lettering and the insignia on Orion's panels are left off on purpose; no flag is drawn because its position was not checked |
| Pad | Lift shaft and work platforms in the tower, umbilical plates and lines on the swing arms, flame-trench walls and deflector, a water tower | A generic pad, sized to the rocket: not SLC-40, SLC-41, SLC-37, LC-39B or LC-1 |
| Light | The Sun stands 20 degrees up so that shadows read; the scene is still dressed as dawn | A dawn Sun would be lower |
| Earth below | The real Blue Marble map (`../maps`). Every vehicle is shown leaving Cape Canaveral (28.5 N, 80.6 W) heading north-east | Electron, Pegasus and others launch from elsewhere, and headings differ by mission |

## Sources

1. SpaceX, Falcon 9: https://www.spacex.com/vehicles/falcon-9/ (script-only page)
2. Space.com, Falcon 9 facts (cross-check): https://www.space.com/18962-spacex-falcon-9.html
3. NASA missions on Falcon 9: https://science.nasa.gov/mission/dart/ (read: "aboard a SpaceX Falcon 9 rocket"), https://science.nasa.gov/mission/tess/ , https://science.nasa.gov/mission/swot/ , https://science.nasa.gov/mission/pace/ (these three pages exist but do not name the rocket)
4. NASA, CubeSat Launch Initiative: https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/
5. SpaceX, Falcon Heavy: https://www.spacex.com/vehicles/falcon-heavy/ (script-only page)
6. NASA, Psyche: https://science.nasa.gov/mission/psyche/ and launch blog https://science.nasa.gov/blogs/psyche/2023/10
7. Spaceflight Now, Falcon Heavy launches Psyche: https://spaceflightnow.com/2023/10/13/falcon-heavy-launches-nasas-psyche-asteroid-probe/
8. Rocket Lab, Electron: https://rocketlabcorp.com/launch/electron/ (403 to automated clients)
9. NASA, CAPSTONE launch: https://www.nasa.gov/press-release/capstone-launches-to-test-new-orbit-for-nasa-s-artemis-moon-missions ; Rocket Lab, CAPSTONE launch preparations (59 ft): https://rocketlabcorp.com/updates/rocket-lab-prepares-to-launch-capstone-mission-to-the-moon-for-nasa/
10. NASA ICON blog, Stargazer airborne with Pegasus XL: https://science.nasa.gov/blogs/icon/2018/11/07/stargazer-aircraft-airborne-with-pegasus-xl-icon-satellite
11. ULA, Vulcan Centaur: https://www.ulalaunch.com/rockets/vulcan-centaur
12. NASASpaceflight, Vulcan flight one: https://www.nasaspaceflight.com/2024/01/vulcan-flight-one-preps/
13. NASA, Atlas V 401 rocket: https://science.nasa.gov/resource/atlas-v-401-rocket/
14. ULA, Atlas V: https://www.ulalaunch.com/rockets/atlas-v
15. ULA, Parker Solar Probe launch: https://www.ulalaunch.com/missions/2018/08/12/united-launch-alliance-successfully-launches-nasa-s-parker-solar-probe-spacecraft
16. NASA Parker Solar Probe blog, launch vehicle rises at SLC-37: https://science.nasa.gov/blogs/parker-solar-probe/2018/04/26/parker-solar-probes-launch-vehicle-rises-at-space-launch-complex-37
17. ULA, Delta IV: https://www.ulalaunch.com/rockets/delta-iv
18. NASA, Space Launch System reference: https://www.nasa.gov/reference/space-launch-system/
19. NASA, SLS launch vehicle stage adapter: https://www.nasa.gov/reference/space-launch-system-launch-vehicle-stage-adapter-lvsa
20. NASA, SLS interim cryogenic propulsion stage: https://www.nasa.gov/reference/space-launch-system-interim-cryogenic-propulsion-stage-icps/
21. NASA, Orion facilities fact sheet ("44-foot-tall Launch Abort System"): https://www.nasa.gov/sites/default/files/atoms/files/orionfacilities_factsheet_2018.pdf ; index of Orion fact sheets: https://www.nasa.gov/humans-in-space/orion-spacecraft/orion-fact-sheets/
