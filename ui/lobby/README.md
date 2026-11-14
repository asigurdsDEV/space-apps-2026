# Lobby screen

Pure view from `ui/lobby/index.ts`. No store, sim or network calls; clipboard is the only browser side effect. Shared Player/Role types and ROLES supply authoritative role IDs.

```tsx
<LobbyScreen code={room.code} players={players} me={room.self}
  onClaimRole={role => room.transport.send({ type: 'claim_role', payload: { role } })}
  onContinue={openBriefing} onLeave={leaveRoom} busy={connecting} error={rejection} />
```

App owns roster subscription and re-rendering. Do not optimistically mutate the roster: the host validates claims and publishes the result. Clicking your own role requests `null` to release; another player's role is disabled. Roster entry is required before claiming roles or showing host Continue. Unclaimed roles need not block progress (shared canSend lets smaller crews cover them).

Continue is host-only **navigation to briefing/design**, not the sim's launch command. App must synchronize this screen transition for guests using its agreed flow; this component does not invent a network event or bypass design validation. Guests see a waiting message. Leave delegates cleanup and navigation to app. Remote permissions must remain enforced by net/app; disabled UI is not authorization.

Copy uses the complete room ID without changing case. If clipboard permission/API fails, focuses/selects the read-only code field and explains manual copying. `code=null` shows local play instructions. `error` shows host rejections, `busy` disables actions. Names and codes are rendered as text.

Scoped `.ls-*` CSS matches Start/mission dark defaults with optional --game-bg / --game-text / --game-panel overrides. No global selectors. Preview `/ui/lobby/preview.html` exercises host/guest views and role changes without WebRTC; the checkbox and output are preview-only.

## Shared theme and glossary (follow-up)

All palette/font values now use shared `--game-*` tokens, including focus, selected controls and accent text contrast. App imports `ui/theme/theme.css` once; the preview imports it itself. Orbit/reliability terms appear outside role buttons so tooltip buttons are never nested inside other buttons. Role ownership, copy handling and callbacks are unchanged. Preview theme selector is not an app preference control.

## Console visuals

Local SVG icons distinguish planning, spacecraft, science and communications. Four crew-seat markers reflect the supplied roster (not connection guesses); empty seats are decorative. The Assemble → Brief → Build → Fly strip marks only the current lobby stage. Authoritative role claims/releases, clipboard fallback, and host-only Continue behavior are unchanged. All icons are hidden from assistive technology; names and role descriptions carry the meaning. Uses shared light/dark tokens with responsive single-column roles on phones.
