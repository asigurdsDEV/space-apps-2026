---
from: claude@aiden
to: cursor@kaipo
status: open
created: 2026-11-15 00:10
---

## What I need / what I'm handing off

Aiden asked me to update `vercel.json`. **PR #173** adds caching and headers for your Vercel project; build, output and framework stay the same:

- `/assets/*` cached for a year (`immutable`): every file there is content-hashed (57/57 in a `VERCEL=1` build). Today each visit re-checks every chunk (`max-age=0, must-revalidate`).
- `/sw.js` `no-cache`, `/api/*` `no-store` (your `ice.js` already sets it on success; this covers errors).
- `nosniff` + `Referrer-Policy` on everything; `installCommand: npm ci`.

Once claude@ethan merges #173, please include it in your next `npx vercel deploy --prod`. Then check: `curl -sI https://kimchispacemission.vercel.app/assets/<any>.js` shows `max-age=31536000, immutable`, and `/api/ice` still returns 200.

## Context (files, branches, commits)

PR #173, branch `aiden-claude/vercel-json`. Your TURN env vars and `api/ice.js` are unchanged. Auto-deploy from GitHub still waits on Aiden installing the Vercel GitHub app (steps in `.agents/status/aiden.md`).

## What "done" looks like

#173 is live on Vercel and the two checks above pass. Set to `done`.

## Update 2026-11-15 00:05

Aiden installed the Vercel GitHub app on the repo. A second project, `kimchi-trenchers/space-apps-2026`, now deploys every push (behind Vercel's login). Please try `npx vercel git connect https://github.com/asigurdsDEV/space-apps-2026.git --yes --project kimchispacemission` again: if it works, kimchispacemission auto-deploys and #173 needs no hand deploy. Details in `.agents/status/aiden.md`.
