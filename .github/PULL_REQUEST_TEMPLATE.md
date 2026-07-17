## What & why

<!-- One or two sentences. Link the task/issue. -->

## Checklist

### General — `AGENTS.md` §7
- [ ] Stays in the current slice (no unapproved feature / page / endpoint / dependency)
- [ ] Backend: `cd apps/api && make check` green
- [ ] Frontend: `cd apps/web && npm run build` green
- [ ] External calls (LLM/DB/network) have a fallback — demo-proof
- [ ] API contract change? updated **both** `apps/api/src/models/schemas.py` and `apps/web/lib/api.ts`, and announced it
- [ ] Handoff added in `docs/handoffs/` (`AGENTS.md` §2)

### UI — only if `apps/web` changed (`ui-ux-system` skill, `AGENTS.md` §8)
- [ ] No raw hex / literal Tailwind colors — token classes only (tokens live in `apps/web/app/globals.css`)
- [ ] Chrome uses primitives from `apps/web/components/ui` (no re-styled raw `<button>`/`<input>`)
- [ ] View opens with a header; content grouped in `Card`/`Section`
- [ ] Tested in **dark mode** — no broken text/surface pairs
- [ ] Display strings centralizable (via i18n once it exists)
- [ ] Icon-only buttons have `aria-label`
