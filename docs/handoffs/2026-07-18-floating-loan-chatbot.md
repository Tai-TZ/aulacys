# Handoff — Floating expandable loan chatbot

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** `feat/shb-client-admin-ui` (no PR created)
- **Status:** ✅ Done

## What changed & why
Moved the personal-loan chatbot out of the landing-page content flow into a standalone floating component. Customers now open it from a persistent launcher and can use a compact window, expand it to a near-full-screen workspace, shrink it again, or close it without losing the current conversation.

## Files touched
- `apps/web/components/client/loan-chatbot.tsx` — owns chat state, API calls, safe fallback, launcher, compact and expanded layouts.
- `apps/web/app/client/page.tsx` — landing-only content plus one `LoanChatbot` mount point.
- `apps/web/app/globals.css` — semantic backdrop, online-state and launcher-shadow tokens.

## How to run / verify
```powershell
cd apps/web
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```
Open `http://localhost:3000/client`. Expected: launcher appears at the bottom-right; clicking opens the compact dialog; the maximize button opens the expanded workspace with history sidebar; minimize and close restore the corresponding states.

## Contract impact
None. The component still uses the existing `{ message }` request and `{ response }` response contract.

## Follow-ups / TODO
- [ ] Persist conversations when the backend conversation contract is approved.
- [ ] Wire attachment and recent-history controls; they are currently presentation-only.
- [ ] Add Escape-key closing and focus trapping if a dialog library is approved.

## Gotchas
On small screens the compact dialog intentionally occupies the full viewport so the composer remains usable. Expanding only changes layout state; messages and draft text remain inside the same mounted component.
