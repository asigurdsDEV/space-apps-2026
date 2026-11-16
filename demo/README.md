# Submission gameplay demo

**Watch:** https://asigurdsdev.github.io/space-apps-2026/demo/

`first-flight-demo.mp4` is the approved 30-second, 1920×1080, 60 fps H.264/AAC gameplay demonstration. `captions.srt` is its timed transcript; captions are already burned into the video. The poster is a frame from this edit.

The existing Pages workflow copies this folder into `dist/demo/` **after** the game build. It stays outside `public/`, the game's offline precache, and `game-assets.json`. Watching the demo does not require loading the game; playing the game does not require downloading the MP4. No new hosting workflow or external player is used.

The generated service worker bypasses `demo/` requests, including navigation, so the watch page cannot replace the cached game entry.

The introduction is a staged local crew rehearsal using game models. Component selection, the anomaly response and the failed mission's successful what-if fix use the real simulator. Live Earth retains source dates; the video does not claim that dated imagery or storm advisories are instantaneous observations.

Music credit: **On the Map's Edge — Jo Wandrini**, supplied for the approved edit. Soundtrack rights are separate from the repository's MIT code license. The page's Inter Tight font is distributed under the included `fonts/OFL.txt`.
