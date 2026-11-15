# Guided campaign

Default solo progression, decision011: First Light Easy ($12M) → Moon Normal ($300M) → Mars Normal ($500M). Reuses data/PROGRAM and getScenario; no parallel sim or catalog balance. CampaignBoard is the entry; the original Start screen remains under Free play, Daily & online.

App marks only these sessions with Active.campaign. awardMission needs a matching scenario, ended status and successful scenario_ended event, and only awards the next incomplete assignment. Failures keep the same grant. Completed assignments can replay without stacking funds. Grants are fixed per mission, not a wallet or leftover-money transfer.

Browser key space-apps-2026:campaign:v1 stores completed base IDs, in order. Validation accepts only the contiguous known route; save never lowers a longer completion list. Blocked storage reports that progress lasts only for this visit; App still tracks it in memory. Existing scores/Daily/design records are untouched.

CampaignResult fits inside WorldMenu's existing dialog after the ending cutscene. Continue/retry creates a fresh solo session and remounts the room so launch, camera and story state reset. Classic/no-WebGL uses the same progress observer; Main menu returns to the funded mission board. designGuide supplies a short current fix/launch objective to the existing first-person hint; no new floating panel.

Tests cover win-only ordered awards, wrong/stale/free-play exclusion at the caller boundary, repeat-win funding, corrupted/blocked storage, locked cards, success/retry copy and actual sim wins under all three assignment configs and anomaly rules. Browser acceptance is in docs/qa/guided-campaign.md.
