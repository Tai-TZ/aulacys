<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Customer portal + multi-agent process UI

- **Date:** 2026-07-18
- **Author:** Cursor agent
- **Branch / PR:** local — not opened yet
- **Status:** ✅ Done

## What changed & why

Renamed customer **workspace** → **customer-portal** (route + copy). Replaced Agent tab “Gợi ý nhanh” with a step timeline of the wow-flow DAG (Planner → Credit ∥ Ops → Compliance → Critic → Gate/HITL) that animates when the user sends a chat message.

## Files touched

- `apps/web/app/customer-portal/page.tsx`, `loading.tsx` — new route
- `apps/web/app/workspace/page.tsx` — redirect → `/customer-portal`
- `apps/web/components/client/workspace/workspace-page.tsx` — agent process panel
- `apps/web/lib/workspace-demo.ts` — `AGENT_RUN_STEPS`
- `apps/web/lib/i18n/dictionaries.ts` — labels + process copy
- `apps/web/components/client/auth-page.tsx`, `client-nav.tsx` — links

## How to run / verify

```bash
cd apps/web && npm run build   # green; route /customer-portal listed
# http://localhost:3000/customer-portal → Agent hỗ trợ
# Send a message → right panel steps animate; mention "LTV"/"veto" → Compliance shows veto briefly
# /workspace redirects to /customer-portal
```

## Contract impact

none

## Follow-ups / TODO

- [ ] Wire process panel to real `/assess` trace instead of timed demo animation
- [ ] Optional: remove unused `AGENT_SUGGESTIONS` from `workspace-demo.ts`

## Gotchas

- Component folder still named `workspace/` — only the **URL** and user-facing title are `customer-portal`.
- Process UI is illustrative (timers), not live LangGraph SSE.
