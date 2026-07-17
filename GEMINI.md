# GEMINI.md

**Read [`AGENTS.md`](./AGENTS.md) first — it is the single source of truth for this repo.**
Do not introduce conventions that differ from it.

Key points (full detail in `AGENTS.md`):
- Monorepo: backend in `apps/api` (FastAPI), frontend in `apps/web` (Next.js).
- Stay in the current slice; no new features or dependencies without team approval.
- API contract lives only in `apps/api/src/models/schemas.py`; the frontend mirrors it in `apps/web/lib/api.ts` — keep both in sync, never invent a second shape.
- Before commit: `cd apps/api && make check` and `cd apps/web && npm run build`. Use Conventional Commits.
- External calls need a fallback so the demo never crashes. Deploy steps: `docs/DEPLOY.md`.
- `apps/web` UI → follow the `ui-ux-system` skill (`AGENTS.md` §8): token classes only (tokens in `apps/web/app/globals.css`), primitives from `apps/web/components/ui`, dark mode by class.
