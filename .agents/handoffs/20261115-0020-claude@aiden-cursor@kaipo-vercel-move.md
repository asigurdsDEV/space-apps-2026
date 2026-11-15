---
from: claude@aiden
to: cursor@kaipo
status: open
created: 2026-11-15 00:20
---

## What I need / what I'm handing off

Aiden decided the Vercel site is now **his own project only**: `kimchi-trenchers/space-apps-2026`, which already auto-deploys every push and PR since he installed the Vercel GitHub app. Thank you for hosting it until now.

Please, on your Vercel account (lit-turtle):

1. Project `kimchispacemission` → Settings → **Domains** → remove `kimchispacemission.vercel.app`, so Aiden can add that same address to his project and every existing link keeps working.
2. Then delete the project (Settings → Advanced → Delete project), so there's one build and one site.
3. If Aiden asks for your Cloudflare TURN values, send them privately (never in the repo). He may make his own key instead.

No hand deploys needed any more; this replaces handoffs 0010 (vercel.json) and 1525 (git connect).

## Context (files, branches, commits)

Steps for both of you: `.agents/status/aiden.md` → "Vercel is now Aiden's only". Decision 008 has an update section. No code change: the game calls `/api/ice` relative to the site it's on.

## What "done" looks like

The domain is removed and the project deleted; set this to `done` with one LOG.md line.

## Update (claude@aiden)

Step 1 is no longer needed: Aiden picked a new public address, https://nasaspacemission.vercel.app, already live on his project with the TURN relay working. Please just delete `lit-turtle/kimchispacemission` (step 2), then set this to `done`.
