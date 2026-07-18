# AGENTS.md — Single Source of Truth for ALL AI agents

> **This file is canonical.** Every AI tool (Claude Code, Cursor, Codex, Gemini CLI, Copilot)
> and every teammate's agent MUST read and follow this file. Tool-specific files
> (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/*`) only point here — never contradict it.
> If something is unclear, ask a human. Do **not** invent your own convention.

---

## How to read this file (markers)

| Marker | Meaning |
|--------|---------|
| ⚠️ **EXAMPLE** | Placeholder content we made up to show the shape. **Must be replaced** with the team's real answer before building. Do NOT treat it as truth. |
| 🔧 **FILL-IN** | A blank (`[...]`) the team must fill (names, decisions). |
| 📌 **DECIDED** | Chosen for THIS hackathon — real and binding now, but changeable by a team decision (log it in `docs/TEAM_RULES.md`). |
| 🔒 **FIXED** | Standing rule. Do NOT change during the hackathon. |

### ⚠️ Decide these FIRST — highest stakes (a wrong answer here wastes the whole team's time)

1. **Mission + "wow" flow + out-of-scope** (§0) — currently an ⚠️ EXAMPLE. Replace with your real product.
2. **Frontend & DB** (§3) — currently 📌 Next.js + in-memory. Confirm or change together.
3. **Owners** (§4) — assign one human per area.

Everything tagged 🔒 below is a standing rule — leave it alone.

---

## 0. Mission &nbsp;·&nbsp; 📌 DECIDED

> **Read [`docs/00-START-HERE.md`](./docs/00-START-HERE.md) before your first task.** Five minutes. It is the conclusion of all the analysis.
> **Building?** [`docs/BUILD-GUIDE.md`](./docs/BUILD-GUIDE.md) is the *how* — file layout, contract, harness, agent specs, build order.
> **Why?** [`docs/SHB-Digital-Expert-Agents-Solution-Design-v2.md`](./docs/SHB-Digital-Expert-Agents-Solution-Design-v2.md). ⚠️ The **v1** file (no `-v2`) is the **superseded corporate scenario** — kept for reference only. Do not build from it.
> The problem statement verbatim: [`docs/reference/problem-statement.txt`](./docs/reference/problem-statement.txt) — the only source for quoting the brief.
> This section is the short version. If §0 and a design doc ever disagree, §0 wins.

- **Product:** Digital Expert Agents for SHB — specialist agents (Credit, Compliance, Operations) that plan, call tools, retrieve regulatory knowledge via RAG, and **execute real actions in banking systems instead of only returning text**.
- **Segment: retail / individual customers.** 📌 Mentor decision. The v1 corporate scenario (20bn VND) is **dead** — do not build it.
- **The one "wow" flow:** a retail mortgage application → Planner reads the **product config** and builds a DAG → Credit and Operations run **in parallel** → Compliance waits on the valuation (it needs LTV) → the declared purpose is contradicted by the evidence → Compliance **vetoes on a hard legal limit** → Planner replans → Critic verifies every number has a tool call and every claim has a citation → a human approves → a ticket is **actually written**. Then **one YAML file** switches the whole thing to a different loan product — no new code.
- **Two products, one graph:** `retail_unsecured_salary` (STP) and `retail_mortgage` (HITL + veto). They differ only by config.
- **Out of scope (do NOT build):** real core-banking integration, full document OCR, SHB's internal scorecard, a third product built deep, fine-tuning, a production RBAC system (**do** demo the MCP role mechanism).

**The veto → replan branch is the demo.** Without it, agents running in parallel are just fan-out and one prompt does the same job. Protect that branch above everything else. Hour-36 stop: if veto does not run, cut everything else.

**Five rules that outrank convenience** (full table + the failure each one causes: `docs/BUILD-GUIDE.md` §1):

1. **An LLM never produces a number.** DTI, LTV, risk weight — deterministic tools in `apps/api/src/agents/tools/`. LLMs interpret and write prose; they do not compute. `Critic` rejects any figure that cannot be traced to a tool call.
2. **Hard legal limits live in `policy/`, not in a prompt.** A model asked to recall a statutory threshold recalls the old one. Policy is data, versioned, with an effective date.
3. **The veto is an edge in the graph, not a sentence in a prompt.** A prompt saying "refuse if it violates X" is a suggestion; a model can ignore it, and will.
4. **The tool whitelist is enforced by the harness, not by the prompt.**
5. **Anything that matters is structure or code. The prompt holds judgement and voice — nothing else.** Rule 5 subsumes 1–4. When unsure: *"if the model ignores this line, does anyone get hurt?"* Yes → code/config/policy. No → prompt.

**Flow lives in config, not in agents.** There is no `if product == ...` anywhere in the graph. A third product is a new file, never new code.

---

## 1. Golden rules (anti-drift — read first) &nbsp;·&nbsp; 🔒 FIXED

These exist so 5 agents on 5 machines produce **one coherent codebase**, not five dialects.

1. **Stay in the slice.** Only build the "wow" flow above. New feature/page/endpoint = ask the team first.
2. **No new dependency without approval.** The stack is locked (§3). Adding a lib is a team decision, logged in `docs/TEAM_RULES.md` → *Decisions*.
3. **One contract.** API request/response shapes live ONLY in `apps/api/src/models/schemas.py`. The frontend mirrors them in `apps/web/lib/api.ts` — keep the two in sync, never invent a second shape or guess.
4. **Small PRs, `main` always deployable.** Short-lived branches, merge fast, never push broken code to `main`.
5. **Follow existing patterns.** Match the file you're editing (naming, structure, error handling). Don't refactor unrelated code mid-task.
6. **Demo-proof over clever.** A boring path that never crashes on stage beats an elegant one that might.
7. **When unsure, stop and ask.** Guessing is how agents drift apart.

---

## 2. Before you write code (ritual — every task) &nbsp;·&nbsp; 🔒 FIXED

1. Read this file + `docs/TEAM_RULES.md`.
2. Read `apps/api/src/models/schemas.py` (the contract) and the module you'll touch.
3. Confirm the task is inside the current slice. If not → flag it, don't build it.
4. State a 3–5 step plan before editing.

## After you write code (ritual — every task)

1. Backend: `cd apps/api && make check` (lint + format + test) must pass.
   Frontend: `cd apps/web && npm run lint && npm run build` must pass.
2. Add/adjust a test for what you changed.
3. Conventional commit (§5). One logical change per commit.
4. If you changed the API contract, update `apps/web/lib/api.ts` too and say so loudly in the PR — it affects other agents.
5. **Write a handoff** — run the `/handoff` skill. After finishing any feature / fix / notable change it writes `docs/handoffs/YYYY-MM-DD-<slug>.md` from `docs/handoffs/TEMPLATE.md` (what changed, how to verify, follow-ups, gotchas). The next person/agent reads it before touching your area. No handoff = task not done.

---

## 3. Locked stack &nbsp;·&nbsp; 📌 DECIDED (change = team decision, log it)

| Layer | Choice | Version |
|-------|--------|---------|
| Language | Python | 3.11 |
| Backend | FastAPI + Uvicorn | 0.115+ / 0.34+ |
| Agent | LangGraph + LangChain | 0.2+ / 0.3+ |
| Validation | Pydantic + pydantic-settings | 2.10+ / 2.7+ |
| LLM | Google Gemini (`gemini-3.1-flash-lite` default; OpenAI fallback) | via `apps/api/src/services/llm.py` |
| Lint/format (api) | Ruff | 0.8+ (line-length 120) |
| Test (api) | pytest + pytest-asyncio | 8+ |
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Next 14 / React 18 |
| DB | Supabase Postgres via SQLAlchemy async (asyncpg) + Alembic | SA 2.0+ / asyncpg 0.30+ / Alembic 1.14+ |

Changing anything here = team decision, logged in `docs/TEAM_RULES.md`.

---

## 4. Repo layout (🔒 FIXED) & ownership (🔧 FILL-IN)

```
apps/
  api/                    # FastAPI backend  (owner: [name] 🔧)
    src/
      agents/             #   LangGraph: graph.py, state.py, nodes/, tools/
      api/                #   FastAPI routes
      models/schemas.py   #   Pydantic schemas = THE contract  (change = notify all + update web)
      services/           #   LLM + business logic
      db/                 #   Supabase Postgres: base.py, session.py (async engine), models/  (see docs/DATABASE.md)
      config.py           #   settings (env-driven)
    tests/                #   mirror src/ layout
    migrations/           #   Alembic migrations (uses DIRECT_URL / session pooler)
    alembic.ini  Dockerfile  Makefile  requirements.txt
  web/                    # Next.js frontend  (owner: [name] 🔧)
    app/                  #   App Router pages (page.tsx = chat UI); globals.css = DESIGN TOKENS (one place)
    components/ui/        #   design-system primitives (Button, Card, Input) — import these
    lib/api.ts  lib/cn.ts #   backend client (mirrors schemas) + class-merge helper
    Dockerfile
packages/
  shared/                 # cross-app contract notes (keep FE/BE types in sync)
docs/                     # ARCHITECTURE.md, TEAM_RULES.md, DEPLOY.md, architecture_diagram.md
eval/                     # evaluation report
presentation/             # pitch deck + demo video
render.yaml               # Render blueprint (API);  Vercel deploys web (see docs/DEPLOY.md)
docker-compose.yml        # local full stack: api :8000 + web :3000
```

- Touching `apps/api/src/models/schemas.py` (the contract) or `apps/api/src/config.py` affects everyone → announce in team channel **and** update `apps/web/lib/api.ts`.
- 🔧 Each area needs one human owner (fill in the `[name]` blanks above). Agents propose; owner merges.

---

## 5. Git & commit rules &nbsp;·&nbsp; 🔒 FIXED

- **Model:** two long-lived branches — `main` (production) + `develop` (integration, default). Feature work off `develop`.
- **Branch:** `feat/<slice>-<short>`, `fix/<short>`. Off `develop`, short-lived (< 1 day). `hotfix/<short>` off `main` for prod emergencies (then back-merge to `develop`).
- **Commit:** Conventional Commits — `type(scope): subject` (≤50 chars). Types: `feat fix chore docs test refactor`.
- **PR:** small, green CI, one reviewer. Feature/fix → **squash-merge** into `develop`; release (`develop`→`main`) → **merge commit**.
- **Never:** push straight to `main`/`develop`, force-push shared branches, commit `.env` or secrets, disable CI to merge.
- **Full branching policy** (naming, release/hotfix flow, branch protection): `docs/BRANCHING.md`.

---

## 6. Coding conventions &nbsp;·&nbsp; 🔒 FIXED

- Type hints on all public functions. Pydantic for all I/O.
- Errors: raise `HTTPException` at API layer; nodes/tools return typed dict, never crash the graph.
- **Demo-proof:** external calls (LLM, DB, network) must have a fallback — on failure return a safe default, log, do not 500 the demo path.
- No secrets in code. Backend reads via `apps/api/src/config.py` (`.env`); frontend only uses `NEXT_PUBLIC_*` vars (never put secret keys there — they ship to the browser).
- English identifiers; comments in the team's language are fine but keep them short.

---

## 7. Definition of Done (every feature) &nbsp;·&nbsp; 🔒 FIXED

- [ ] Runs end-to-end locally (API `:8000` + web `:3000`, or `docker compose up`)
- [ ] Backend `cd apps/api && make check` green; frontend `cd apps/web && npm run build` green
- [ ] Has a fallback for its external calls
- [ ] Contract unchanged, OR change announced + `schemas.py` **and** `apps/web/lib/api.ts` updated
- [ ] Deployed to the live URL (or clearly PR-only) — see `docs/DEPLOY.md`
- [ ] Handoff written in `docs/handoffs/` (copy `TEMPLATE.md`) — see §2

---

## 8. Frontend UI/UX — follow the `ui-ux-system` skill &nbsp;·&nbsp; 🔒 FIXED

The design system skill lives in `.claude/skills/ui-ux-system/` (every agent has it after clone).
Its rules are binding for anything in `apps/web`:

1. **Tokens, never raw values.** Use token classes (`bg-primary`, `text-foreground`, `border-border`) — never raw hex or literal Tailwind colors (`bg-blue-600`, `bg-gray-50`) when a token exists. Tokens are defined in **ONE place**: `apps/web/app/globals.css`. Change the look there, not per component.
2. **Primitives own the chrome.** Import `Button` / `Card` / `Input` from `apps/web/components/ui`. Never re-style a raw `<button>`/`<input>`; tweak via `className` (merged by `cn()`).
3. **Compose, don't hand-build.** Same rhythm every screen.
4. **Dark mode by class.** `.dark` on `<html>` overrides the tokens — avoid per-element `dark:` soup.
5. **No hard-coded display strings** once i18n exists (single-language MVP for now — keep text centralizable).
6. **A11y floor:** ≥12px text, visible focus ring, `aria-label` on icon-only buttons, `*/on-*` color pairs.

New color/spacing/font → add a token in `globals.css`, then use it. Run `/ui-ux-system` for guidance. Full merge checklist is in the PR template.
