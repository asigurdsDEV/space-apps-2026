# First Flight: 3-minute judge pitch with live demo

By claude@jamie, 2026-11-15, from Jamie's mentor notes, [PITCH.md](PITCH.md), [DEMO.md](DEMO.md), [BRAINSTORM.md](game-design/BRAINSTORM.md), [ui/live/README.md](../ui/live/README.md) and the team log. Each agent: check the lines for your area (handoff 20261115-1115).

Mentor notes this follows:
- Inform the judges, don't only excite them.
- Spend a whole minute or more in the website.
- Keep slides simple.
- About 10 seconds on how we worked.
- Everyone speaks.
- Land on 3:00, with questions at the end.

## Run sheet (3:00)

| Time | Who (suggested) | What is on screen | Section |
|---|---|---|---|
| 0:00–0:20 | Sarah | Slide 1: title + one-line problem | 1. Intro: problem and audience |
| 0:20–0:30 | Aiden | Slide 2: brainstorm table / six people + agents | 1. Intro: process (10 s) |
| 0:30–0:45 | Jamie | Live site: guided mission board | 2. Solution |
| 0:45–1:55 | Jamie drives and talks | The game, live | 3. Demo (70 s) |
| 1:55–2:20 | Ethan | Live Earth, from the in-game Mission menu | 3. Demo: Live Earth |
| 2:20–2:50 | Caleb + Kaipo | Slide 3: impact | Impact |
| 2:50–3:00 | Sarah | Slide 4: URL + QR + "Questions?" | Close |

Only four slides. The website is the focus.

## Script

**0:00 — Sarah (problem and audience)**
"Real space missions are trade-offs. A better camera means more mass, more power, more data and more cost. Students almost never get to try a whole mission from design to operations. Most tools teach one piece, like orbits or rockets, on its own. First Flight is for students and first-time space fans who want to try the whole thing."

**0:20 — Aiden (process, 10 seconds)**
"We started with the NASA challenge brief and scored twelve game ideas on fun, teaching, accuracy and whether we could ship them. Six of us each worked with an AI coding agent. A shared task board kept us from overlapping. It's built with TypeScript, React and three.js, and it runs on real NASA and NOAA data."

**0:30 — Jamie (solution)**
"First Flight is a free browser game. You run a space program: Earth, then the Moon, then Mars. Each win earns the next assignment and a bigger grant. Let me show you."

**0:45 — Jamie (live demo, about 70 seconds, keep talking while you play)**
1. On the board, click **Start guided mission**. "Our first grant is twelve million dollars to photograph Earth."
2. Walk to a station (WASD, E). "This is mission control. Each station is a real subsystem."
3. Swap the radio to **X-band** and point at the downlink gauge. "The starting radio can't send our pictures home fast enough. Collecting science only counts if you can send it down."
4. Fit the **12U body**, **IR spectrometer** and **large solar wings**. "More science needs more power and a bigger spacecraft. Every gauge moves."
5. **Go/No-Go poll**, all four consoles GO, launch. Skip the long cutscene. "Four flight controllers have to say GO, like a real launch."
6. The **storm alarm** appears. "This storm is real. NASA's records show a severe geomagnetic storm on 7 September 2017. The game puts it on the day it happened." Pick the first (safe) option.
7. Speed up to the **debrief**. "Mission success. The Moon is unlocked with a three-hundred-million-dollar grant."

**1:55 — Ethan (Live Earth)**
Open the **Mission menu → Live Earth**.
"The game uses history. Live Earth shows today: last night's satellite picture of the whole planet from NASA, the real satellites and debris where they are this second, today's space weather, and open storms. Pick Landsat: hundreds of tracked debris pieces cross its height. Pick the ISS: about a dozen. That's the orbit trade-off you just made in the game, happening right now."

**2:20 — Caleb, then Kaipo (impact)**
Caleb: "It runs in a browser, free, with no account. There's a classic view for screen readers and computers without 3D graphics. It works offline once downloaded, so a classroom with bad Wi-Fi can still play."
Kaipo: "Up to four players can each take a console role and have to agree before launch, which is how real mission teams work. And a daily mission built on today's real event gives everyone a reason to come back tomorrow."

**2:50 — Sarah (close)**
"Every choice teaches a trade-off. Scan the code and try it now. We'd love your questions."

## Impact (slide 3, and the source for the impact lines)

Keep the slide to these four lines. The text under each is the backup for questions.

1. **Learn the whole system, not one piece.** Every part changes mass, power, data, cost and science at the same time, and the Go/No-Go consoles explain each NO-GO in plain words. A failed mission ends with "what would have fixed it", so losing teaches something.
2. **Real data, honest limits.** Storm alarms come from NASA SPDF OMNI records of real G3+ storm days. Live Earth uses NASA GIBS imagery, NASA EONET storms, NOAA SWPC space weather and CelesTrak orbits. Prices and science points are teaching approximations, and the game says so.
3. **Anyone can play.** Free, in a browser, no account, no API key, nothing about the player sent anywhere. There's a Classic view for screen readers and no-3D computers, and it works offline after the download.
4. **Built to play with others and come back.** Up to four crew roles, solo guided missions from Earth to Mars, and a daily mission seeded by today's real event.

Don't claim measured learning gains. We have internal playtests only, no study. "Designed to teach" is accurate; "students learn X% more" is not.

## Why we added Live Earth (for the NASA judges)

**In one sentence:** the game teaches with real history, and Live Earth shows the same forces happening right now, all from NASA's open data. A player leaves knowing where to look at the real thing.

Why it matters for this challenge:

- **It makes the trade-offs visible on the real sky.** Orbit choice is one of the game's hardest decisions. Live Earth screens real satellites against four tracked debris clouds. On 15 Nov 2026, Landsat 8 had 647 tracked pieces crossing its height and the ISS had 11, while GOES-19 in geostationary orbit had none. The risk the game models is visible on today's sky.
- **It ties the storm alarms to today's space weather.** The game's storm cards fire on real G3+ days (Kp 7 or more). Live Earth shows NOAA's Kp now and explains that "a storm like the ones in your mission would read Kp 7 or more."
- **It shows off NASA's open data.** The globe uses last night's full-Earth picture from VIIRS on NOAA-20, served by NASA GIBS, and open severe storms from NASA EONET. No key, no account. That's the point of NASA's open-data mission, and the game becomes a door into it.
- **It feeds back into play.** Since PR #201, the Daily mission takes the day's real event from these feeds (geomagnetic storm, else an open severe storm, else tracked debris) and puts that alarm first. Each day's mission is different and real.
- **It's honest about accuracy.** Every item shows where it's from and how old it is. The close-approach number is labelled "a screening from public orbit data, good to a few kilometres, not an official collision warning". We checked the ISS position against an independent tracker to 0.02°.

Note: CelesTrak (orbits) and NOAA SWPC (space weather) are not NASA. Say "NASA and NOAA data", not "all NASA".

## Demo safety (don't get stuck)

- **Before the pitch:** on the presenting laptop, open the live site, run **Download game** and **Continue**, then sign in to nothing. Use a fresh browser profile so First Light is funded and Moon is locked.
- **Rehearse the exact path** above at least twice on that laptop. The reference build (12U, camera + IR spectrometer, large solar, X-band, rideshare, SSO) wins in the simulation. Seed 1 puts the real 7 Sep 2017 storm on mission day 1.
- **Backup tabs:** keep a second tab paused at "all GO, ready to launch" and a third at the debrief. If the walk or launch stalls, switch tabs and keep talking.
- **Live Earth needs the internet.** Open it once before the pitch so the picture and orbits are cached. If the network fails, it says "Live data needs a connection" and shows the bundled Earth. Keep a screenshot of the full screen as a last resort.
- **Don't open Free play** in the demo. Its $8M Normal budget is a different mission from the guided $12M one.

## Likely questions

- **"How accurate is it?"** The real parts are the storm dates and strengths, satellite positions (checked against an independent tracker), the imagery, and the rocket and orbit trade-offs. Prices, science points and failure odds are team-tuned teaching numbers, and each catalog names its source.
- **"Can bigger rockets fly the Earth mission?"** No. Only the rideshare slot fits the $12M grant. The Electron fits but can't reach the science goal. That is the lesson: the cheapest ride that reaches the orbit wins. Free play lets you fly any rocket.
- **"How does co-op work?"** Up to four players connect browser-to-browser over WebRTC. Each takes a console role, and all four must say GO.
- **"What did the AI do?"** Each of us directed an AI coding agent. The humans chose the design, playtested and decided. The agents wrote code and tests, and checked each other's work through the shared board. See the AI-use note in [SUBMISSION.md](SUBMISSION.md).
- **"What's next?"** (team to agree) More missions in the program, and a review board before launch (idea G in the brainstorm).
