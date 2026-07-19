# Handoff — Fix Docker parents[3] crash on agent-worker / orchestrator

- **Date:** 2026-07-19
- **Author:** Cursor agent (Tai)
- **Branch / PR:** main
- **Status:** ✅ Done (deployed to Cloud Run)

## What changed & why

Cloud Run deploy of `agent-worker-svc` failed: container exit on import because
`aulacys.config` did `Path(__file__).parents[3]`. In the image, code lives at
`/svc/aulacys/config.py` (shallow) so `parents[3]` raises `IndexError`. Fixed
resolver to use monorepo root locally and `/svc` in Docker.

## Files touched

- `packages/shared/aulacys/config.py` — safe `_resolve_repo_root()`

## How to run / verify

```powershell
# After rebuild of agent-worker + orchestrator images:
curl https://agent-worker-svc-hnwyafogwq-as.a.run.app/health
# {"status":"ok","agents":[...]}
```

## Contract impact

none

## Follow-ups / TODO

- [ ] Gateway `/status` may show cold-start timeouts on audit/cic/legal (~2s) — soft, non-blocking
- [ ] Prefer committing this before next full `deploy-gcp-draft.ps1` so builds pick it up automatically

## Gotchas

Any service that `COPY packages/shared/aulacys ./aulacys` into `/svc` will hit this if
code assumes monorepo depth. Prefer `parents` guards or env-based roots.
