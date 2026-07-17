---
name: hackathon
description: Build a hackathon feature the team's way — enforces scope discipline, the locked stack, a demo-proof vertical slice, and a consistent workflow across every teammate's agent. Use whenever implementing, extending, or fixing a feature in this repo, or when the user says "build", "add feature", "/hackathon", or asks how to approach a task here. Reads AGENTS.md as the source of truth so all agents stay aligned.
---

# Hackathon build workflow

You are building under time pressure with several other agents on the same repo.
Your job is to ship a **thin, demo-proof vertical slice** without drifting from the team.
`AGENTS.md` is the single source of truth — this skill operationalizes it.

## Step 1 — Load context (always, before touching code)

1. Read `AGENTS.md` (mission §0, golden rules §1, locked stack §3, DoD §7).
2. Read `docs/TEAM_RULES.md` → *Decisions* (what stack/scope is already locked).
3. Read `apps/api/src/models/schemas.py` — the API contract. This is the shared language between the backend and the frontend (`apps/web/lib/api.ts`).
4. Read the module you'll edit + its test.

## Step 2 — Scope gate (hard stop)

Ask: *is this task inside the current "wow" slice (AGENTS.md §0)?*
- **No** → do NOT build it. Surface it to the user/team as out-of-scope. Stop.
- **Needs a new dependency or changes the locked stack?** → stop, require team approval, and note it must be logged in `docs/TEAM_RULES.md`.
- **Yes, in scope** → continue.

## Step 3 — Plan (state it before editing)

Give a 3–5 step plan. Prefer the smallest change that makes the slice work end-to-end
(user input → agent → visible result). No speculative abstractions.

## Step 4 — Implement thin

- Match existing patterns in the file. No unrelated refactors.
- Monorepo: backend = `apps/api`, frontend = `apps/web`.
- If the API shape changes, edit `apps/api/src/models/schemas.py` FIRST, then update `apps/web/lib/api.ts` to match, and announce it — other agents depend on it.
- Backend logic lives in `apps/api/src/services/` and `apps/api/src/agents/`; routes in `apps/api/src/api/`; settings via `apps/api/src/config.py` (never hardcode secrets). Frontend UI in `apps/web/app/`.

## Step 5 — Demo-proof (non-negotiable)

Every external call (LLM, DB, network) needs a fallback:
- On failure → log, return a safe default, keep the demo path alive. Never let it 500 the "wow" flow.
- Prefer seeded/cached data for the demo so it works offline.

## Step 6 — Definition of Done

Run and confirm `AGENTS.md` §7:
- [ ] End-to-end works locally (API `:8000` + web `:3000`, or `docker compose up`)
- [ ] Backend `cd apps/api && make check` green; frontend `cd apps/web && npm run build` green
- [ ] Fallback present
- [ ] Contract unchanged OR change announced + `schemas.py` **and** `apps/web/lib/api.ts` updated
- [ ] A test added/updated for the change

## Step 7 — Commit

Conventional Commit, one logical change: `feat(scope): subject` (≤50 chars).
Keep `main` deployable. Small PR, one reviewer.

## Anti-drift reminders

- One contract (`schemas.py`), one stack (§3), one slice (§0). When any of these is ambiguous, **ask a human** — do not invent your own answer.
- Never disable CI to merge, never commit `.env`/secrets, never force-push shared branches.
