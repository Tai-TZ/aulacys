# CLAUDE.md

**Read [`AGENTS.md`](./AGENTS.md) first — it is the single source of truth for this repo.**
Everything below is Claude-Code-specific and must never contradict `AGENTS.md`.

## How to work here

- Use the `/hackathon` skill for any build task — it walks the required workflow
  (scope check → plan → thin implementation → fallback → DoD → conventional commit).
- Before editing: read `AGENTS.md` §2 ritual and `packages/shared/aulacys/models/schemas.py` (the contract).
- After editing: backend → `cd packages/shared && ruff check aulacys/ tests/ && pytest tests/`; frontend → `cd apps/web && npm run build`. Do not commit red.
- When a feature/fix is done: run the `/handoff` skill (writes `docs/handoffs/…`) — required by `AGENTS.md` §2. No handoff = not done.
- Stay inside the current slice (`AGENTS.md` §0/§1). New feature or new dependency = ask the team.
- Microservices: domain core (agents/policy/schemas/LLM) in `packages/shared/aulacys`; the agent graph is hosted by `services/orchestrator-svc` (:8000, composition root — replaced the old `apps/api` monolith); frontend in `apps/web`. If you change the API contract, update `apps/web/lib/api.ts` too.
- Any `apps/web` UI work → follow the `/ui-ux-system` skill and `AGENTS.md` §8: token classes only (tokens in `apps/web/app/globals.css`), import primitives from `apps/web/components/ui`, dark mode by class.

## Commands

```bash
# Domain core (packages/shared) — agents, policy, schemas, LLM
cd packages/shared && ruff check aulacys/ tests/ && pytest tests/   # before every commit

# Orchestrator API (services/orchestrator-svc) — hosts the agent graph on :8000
cd services/orchestrator-svc && PYTHONPATH=.:../../packages/shared uvicorn app.main:app --reload --port 8000

# Frontend (apps/web)
cd apps/web && npm run dev   # Next.js dev on :3000
cd apps/web && npm run build # production build

# Whole stack (default: full microservice stack)
docker compose up --build    # orchestrator :8000 + web :3000 + all services
```

Deploy: `docs/DEPLOY.md` (orchestrator API → Render via `render.yaml`, web → Vercel).
