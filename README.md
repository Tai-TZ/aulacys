# [Project Name]

> One-line summary: [problem] → [solution] for [target user].

Monorepo: **`apps/api`** (FastAPI + LangGraph agent) and **`apps/web`** (Next.js UI).

## Quick Start

```bash
# 1. Clone
git clone <your-repo-url>
cd <your-repo>
```

**2. Backend** (`apps/api`) — one-shot setup script (creates `.venv`, installs deps, makes `.env`):

```bash
cd apps/api
bash scripts/setup.sh                                        # Linux / macOS / Git Bash
# Windows: powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
# edit .env → add OPENAI_API_KEY, then:
make run          # or: uvicorn src.main:app --reload --port 8000
# Swagger UI: http://localhost:8000/docs
```

**3. Frontend** (`apps/web`) — in a second terminal:

```bash
cd apps/web
npm install
cp .env.example .env.local        # Windows: Copy-Item .env.example .env.local
# .env.local → NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                        # http://localhost:3000
```

**Or run the whole stack in Docker:**

```bash
docker compose up --build          # api :8000 + web :3000
```

## Project Structure

```
apps/
├── api/                     # FastAPI backend
│   ├── src/
│   │   ├── agents/          #   LangGraph agent (graph, state, nodes, tools)
│   │   ├── api/             #   FastAPI routes
│   │   ├── models/          #   Pydantic schemas = the API contract
│   │   ├── services/        #   Business logic (LLM, etc.)
│   │   ├── config.py        #   Settings
│   │   └── main.py          #   App entry point
│   ├── tests/               #   pytest suite
│   ├── scripts/             #   setup.sh / setup.ps1
│   ├── Dockerfile  Makefile  requirements.txt
├── web/                     # Next.js frontend (App Router + TS + Tailwind)
│   ├── app/                 #   pages (page.tsx = chat UI)
│   ├── lib/api.ts           #   backend client — mirrors apps/api schemas
│   └── Dockerfile
packages/shared/             # cross-app contract notes
docs/                        # ARCHITECTURE, TEAM_RULES, DEPLOY, diagrams
eval/  presentation/         # evaluation + demo materials
render.yaml                  # Render blueprint (API)
docker-compose.yml           # local full stack
.github/workflows/           # CI (api + web)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /api/v1/chat | Chat with agent |
| GET | /api/v1/status | Agent status |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Agent | LangGraph + OpenAI (`gpt-4o-mini`) |
| Backend | FastAPI + Python 3.11+ |
| Frontend | Next.js (App Router) + TypeScript + Tailwind |
| Database | In-memory (dict) — no DB for MVP |
| DevOps | Docker + GitHub Actions |

> Stack is locked — see [`AGENTS.md`](./AGENTS.md) §3. Changing it is a team decision (log it in `docs/TEAM_RULES.md`).

## Deploy

API → Render (`render.yaml`), Web → Vercel. Full step-by-step incl. CORS wiring:
**[`docs/DEPLOY.md`](./docs/DEPLOY.md)**.

## Team & AI agents

Working on this repo — whether as a person or via an AI tool — follow these:

- **[`AGENTS.md`](./AGENTS.md)** — single source of truth for every AI agent (Claude Code, Cursor, Codex, Gemini). Tool files (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/`) just point here, so all teammates' agents stay aligned.
- **[`docs/TEAM_RULES.md`](./docs/TEAM_RULES.md)** — working agreement for people: ownership, git flow, scope discipline, decision log.
- **`/hackathon` skill** (`.claude/skills/hackathon/`) — run it in Claude Code for any build task; it enforces scope, the locked stack, demo-proof fallbacks, and a consistent workflow.

## License

MIT
