# Handoff — stack.ps1 one-command local runner

- **Date:** 2026-07-18
- **Author:** Cursor agent
- **Branch / PR:** `chore/stack-script` → `develop`
- **Status:** ✅ Done

## What changed & why

Windows needed one entrypoint to start/stop/status API + web + optional microservices instead of many terminals. Added `scripts/stack.ps1`; `scripts/run.ps1` now wraps demo `up`.

## Files touched

- `scripts/stack.ps1` — `up|down|status|restart`, profiles `demo` / `full`
- `scripts/run.ps1` — thin wrapper → `stack up -Profile demo`
- `.gitignore` — `.run/`
- this handoff

## How to run / verify

```powershell
cd D:\aiinovation
.\scripts\stack.ps1 up -Setup          # first time
.\scripts\stack.ps1 status
# open http://localhost:3000/admin
.\scripts\stack.ps1 down

.\scripts\stack.ps1 up -Profile full   # all microservices + wired env
```

## Contract impact

none

## Gotchas

- PIDs/logs under `.run/` (gitignored). `down` uses `taskkill /T`.
- `demo` does **not** set service URLs → monolith fallbacks (demo-proof).
- `full` sets POLICY/AUDIT/CIC/… + agent worker URLs on API + gateway.
- OPENAI_API_KEY optional.
- Docker still: `docker compose -f docker-compose.services.yml up --build`
