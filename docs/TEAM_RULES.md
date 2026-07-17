# Team Rules — Working Agreement (for humans)

Rules for the **people** on the team. Rules for AI agents live in [`AGENTS.md`](../AGENTS.md).
Keep the two consistent — if you change how we work, update both.

---

## 1. Roles & ownership

| Area | Owner | Backup |
|------|-------|--------|
| Backend / agent (`apps/api/`) | [name] | [name] |
| Frontend (`apps/web/`) | [name] | [name] |
| DevOps / deploy / CI | [name] | [name] |
| Pitch / video / eval docs | [name] | [name] |

The **owner merges** their area. Anyone (or their agent) can propose via PR.
Shared files (`apps/api/src/models/schemas.py`, `apps/api/src/config.py`, `apps/web/lib/api.ts`, `AGENTS.md`) — change only after a heads-up in the team channel.

## 2. Scope discipline (most important)

- We build **one** "wow" flow (defined in `AGENTS.md` §0). Everything else is roadmap, not now.
- New feature / page / endpoint / dependency = **team decision**, logged in *Decisions* below.
- If in doubt, cut it. A finished small demo beats an unfinished big one.

## 3. Git flow

- Two long-lived branches: `main` = production (always deployable), `develop` = integration (default).
- Branch per task: `feat/…`, `fix/…`, **off `develop`**, merged same day if possible. `hotfix/…` off `main`.
- Feature/fix PRs squash-merge into `develop`; ship via release PR `develop` → `main` (merge commit).
- Conventional Commits. Small PRs. One reviewer, green CI.
- Never commit secrets/`.env`. Never push straight to `main`/`develop`. Never force-push shared branches. Never disable CI to merge.
- Full branching policy (naming, release/hotfix flow, branch protection): [`docs/BRANCHING.md`](./BRANCHING.md).

## 4. Definition of Done

A task is done when: runs end-to-end locally, `make check` is green, has a fallback for
external calls, contract change (if any) announced, and it's on the live URL (or clearly PR-only).
Full list: `AGENTS.md` §7.

## 5. Cadence & comms

- Short standup 2×/day: *what's live, what's blocked, what's next.*
- Blocked > 30 min → ask, don't grind alone.
- Deploy early (day 1) and keep the live URL green throughout — not a last-hour task.
- Always keep a **recorded backup demo video** in case the live demo fails.

## 6. Decisions (Decision Log — keep it short)

Log every locked choice so agents and teammates don't re-litigate or drift.

| Date | Decision | Reason |
|------|----------|--------|
| 2026-07-17 | Monorepo: `apps/api` (FastAPI) + `apps/web` (Next.js) | One repo, atomic FE+BE changes; clean app boundaries |
| 2026-07-17 | Frontend = Next.js (App Router + TS + Tailwind) | Polished UI, strong UX scoring; deploys cleanly to Vercel |
| 2026-07-17 | DB = in-memory (dict) | No persistence needed for MVP; fewer moving parts to break on stage |
| 2026-07-17 | Deploy: API → Render, Web → Vercel | Free tiers, git auto-deploy; see `docs/DEPLOY.md` |
| 2026-07-17 | ~~DB = in-memory~~ → **Supabase Postgres** via SQLAlchemy async + Alembic | Project will be deployed; need stable persistence, avoid rework. Not Prisma (Node ORM, poor Python fit). See `docs/DATABASE.md` |
| 2026-07-17 | Branching: **`develop` + `main`(prod)** (was GitHub Flow) | Want a protected staging gate before production. See `docs/BRANCHING.md` |
| YYYY-MM-DD | [next locked choice] | [why] |
