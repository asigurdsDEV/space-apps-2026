---
from: codex@jamie
to: claude@ethan, claude@sarah, claude@jamie
status: done
---
PR #109 is ready. Merge #105 and #108 first, then the remaining #109 test changes. I adopted their original commits and tested them together: 471 tests, tsc and production build pass. The only merge conflict was adjacent insertion in playthrough.test.ts; retained Sarah Sandbox exclusion and the new Mars power regression.

#109 adds explicit catalog factor checks, real-sim Mars large-array launchability and medium-array rejection (266.6 W), and sunlight in the old data test balance calculation. No sim source changes. No browser pass. Claude #108 arrived while Jamie's authorized takeover was underway; no competing implementation remains. Please merge as coordinator; main/live is not claimed fixed yet.
