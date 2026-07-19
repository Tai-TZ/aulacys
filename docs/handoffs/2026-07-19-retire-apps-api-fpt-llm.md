# Handoff — Retire apps/api husk + wire FPT AI Factory LLM

- **Date:** 2026-07-19
- **Author:** Claude Code (agent)
- **Branch / PR:** chore/retire-apps-api-fpt-llm → develop
- **Status:** ✅ Done

## What changed & why
The repo moved from the `apps/api` monolith to microservices; `apps/api` was already a
gutted shell (zero Python, `uvicorn src.main:app` pointed at a non-existent `src/`), yet
CI/compose/docs/launchers still referenced it. Removed the husk and repointed every runtime
entrypoint to `services/orchestrator-svc` (the composition root that hosts the LangGraph
agent core on :8000). Also wired the LLM prose layer to **FPT AI Factory** (OpenAI-compatible)
and confirmed all five agents run **in-process in one container** (no distributed workers).

## Files touched
- `apps/api/**` — **deleted** (17 files: Dockerfile, Makefile, monolith Alembic migrations, etc.). No code imported it; migrations superseded by per-service `alembic.ini`.
- `docker-compose.yml` — `api` service now builds `services/orchestrator-svc/Dockerfile` (context `.`), env_file `services/orchestrator-svc/.env`, dropped `apps/api/data` volume; removed `AGENT_WORKER_URL` + `agent-worker-svc` from the orchestrator so all 5 agents run in-process.
- `render.yaml` — deploys orchestrator Dockerfile (context repo root); added FPT env (`LLM_PROVIDER=openai`, `OPENAI_BASE_URL`, `MODEL_NAME`/`STRONG_MODEL`/`MINI_MODEL`); `OPENAI_API_KEY` stays `sync:false`.
- `run.bat` / `scripts/run.sh` — backend launch → `services/orchestrator-svc` with `PYTHONPATH` including `packages/shared`; uvicorn target `app.main:app`.
- `docker-compose.services.yml` — comment updated (monolith → orchestrator).
- `packages/shared/aulacys/config.py` — added `openai_base_url` setting (empty ⇒ real OpenAI; set for FPT).
- `packages/shared/aulacys/services/llm.py` — OpenAI branch passes `base_url=settings.openai_base_url or None`.
- `AGENTS.md` / `CLAUDE.md` — layout/paths/commands updated to microservices; contract now `packages/shared/aulacys/models/schemas.py`; LLM note mentions FPT.

## How to run / verify
```bash
# domain-core tests (unchanged, must stay green)
cd packages/shared && ruff check aulacys/ tests/ && pytest tests/     # 92 passed

# run orchestrator locally (5 agents in-process)
cd services/orchestrator-svc && PYTHONPATH=.:../../packages/shared uvicorn app.main:app --reload --port 8000

# verify FPT LLM connectivity (needs services/orchestrator-svc/.env filled + network)
cd services/orchestrator-svc && python -c "import sys; sys.path.insert(0,'../../packages/shared'); from aulacys.services.llm import get_llm; print(get_llm('mini').invoke('Reply: OK').content)"
```
Expected: tests 92 passed; FPT call prints `OK`; a full `process_application({'query':''})`
run returns `outcome=stp_approved` with planner/credit/compliance traces showing
`model=Llama-3.3-70B-Instruct fallback=False`.

## Contract impact
none — `schemas.py` unchanged (only moved conceptually; the file already lived in
`packages/shared/aulacys/models/schemas.py`). `apps/web/lib/api.ts` untouched.

## Follow-ups / TODO
- [ ] **Task 3 — make the 5 agents genuinely agentic** (Planner LLM-builds the DAG + whitelist validator; Critic real LLM critique; Credit/Ops tool-calling loop). Invariant stays: numbers = tools, veto = policy YAML.
- [ ] `services/agent-worker-svc` is now unused for the single-container path but still defined in compose (idle). Remove it (and the gateway's `AGENT_WORKER_URL`) if distributed workers are truly dropped.
- [ ] `.github/workflows/ci.yml` still has stale comments naming `apps/api` (harmless; tidy when convenient).
- [ ] Historical `docs/handoffs/*` and several `docs/*.md` still mention `apps/api/src/...` paths — left as history; update only if they mislead.

## Gotchas
- **DeepSeek-V4-Flash on FPT cannot do structured output** (returns empty `parsed`) → every mini agent failed 3 schema retries then fell back. `MINI_MODEL` was switched to `Llama-3.3-70B-Instruct` (proven to support it). Any replacement mini model MUST support function-calling / json-schema, else agents silently drop to deterministic prose and burn wasted calls.
- **Correct FPT host is `mkp-api.fptcloud.com`** (AI Marketplace), NOT `api.fptcloud.com` (no DNS). Base URL: `https://mkp-api.fptcloud.com/v1`.
- **`.env` is per-process CWD** (`env_file=".env"` in `aulacys.config`). The LLM key lives in `services/orchestrator-svc/.env` (gitignored). In Docker the file is NOT copied into the image — pass env via compose `env_file`/`environment`.
- **Single-container invariant:** do NOT set `AGENT_WORKER_URL` (or `*_AGENT_URL`) or the graph dispatches agents to `agent-worker-svc` instead of running them in-process.
- Deterministic core still runs with no key at all (demo-proof); the LLM only polishes `rationale`/`remediation` prose — it never produces numbers or veto.
