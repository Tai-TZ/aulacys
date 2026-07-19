<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Admin agent graph builder (React Flow)

- **Date:** 2026-07-19
- **Author:** agent
- **Branch / PR:** local (uncommitted)
- **Status:** ✅ Done

## What changed & why

Added a P2 **visual agent builder** under admin: edit product graph config (`agents` / `depends` / `tools` / `gate` / `policy`) on the same schema as `agents/products/*.yaml`. Uses **`@xyflow/react`** (logged in `TEAM_RULES.md`). Next.js App Router loads the canvas **client-only** via `next/dynamic` `{ ssr: false }` so React Flow never runs on the server. Drafts go to `localStorage`; export downloads YAML — runtime still reads repo YAML files.

**2026-07-19 (chrome + agent-scoped config):**
- Top chrome compacted to **one toolbar row** (product + status badges + policy + Ops/LTV/STP chips + actions). Removed the long status line and full-width NHANH bar so the canvas gets most of the viewport.
- **Cấu hình** tab is agent-scoped via `TOOLS_BY_AGENT` / `toolsForAgent()` in `graph-config.ts`. Credit / Operations / Compliance each see their own tools + depends; Planner/Critic show runtime hints only. Product Policy/STP live on the toolbar, not inside per-agent config.

**2026-07-19 (canvas-first inspector drawer):**
- Permanent `280px` split pane removed. Canvas is full-width; inspector is a **right overlay drawer** (default closed). Click a node or **Panel** → opens; **Ẩn panel** / X closes.
- Metrics: Depends / Limits / Chỉ số are **accordions**; removed redundant "Đang xem"; thinner agent chips. Still agent-scoped (Credit metrics only for Credit).

## Files touched
- `apps/web/package.json` — dependency `@xyflow/react`
- `apps/web/lib/graph-config.ts` — schema, presets, `TOOLS_BY_AGENT`, validate, YAML dump, localStorage
- `apps/web/components/admin/agent-graph-builder.tsx` — React Flow canvas + compact toolbar + agent-scoped inspector
- `apps/web/components/admin/agent-metrics-panel.tsx` — agent-scoped Chỉ số
- `apps/web/app/admin/agent-builder/page.tsx` — page + `dynamic(..., { ssr: false })`
- `apps/web/components/admin/admin-shell.tsx` — sidebar link **Agent builder**
- `docs/TEAM_RULES.md` — decision log for the new dependency

## How to run / verify
```bash
cd apps/web
npm install
npm run dev
# open http://localhost:3000/admin/agent-builder (after admin login)
npx tsc --noEmit -p tsconfig.json
```
Expected: full-width canvas; click Credit → drawer opens with Chỉ số (accordions); Panel / Ẩn panel toggles; hide drawer → graph uses full frame again.

## Contract impact
none — no `schemas.py` / `api.ts` change. Builder does not publish into orchestrator runtime yet.

## Follow-ups / TODO
- [ ] Persist draft/publish to catalog DB JSONB + API (replace localStorage)
- [ ] Wire published config into `load_product_config` with file fallback
- [ ] Do not add LLM auto-edit of DAG
- [ ] Optional: expose `gate.else` (hitl|reject) in toolbar if demos need reject path

## Gotchas
- **Must stay client-only** — importing `@xyflow/react` in a Server Component will break SSR.
- CSS: `@xyflow/react/dist/style.css` imported inside the client builder module.
- Whitelist only: `credit` / `operations` / `compliance` + `TOOL_WHITELIST` / `TOOLS_BY_AGENT` in `graph-config.ts`.
- Planner/Critic are fixed runtime nodes — no tool toggles in Cấu hình.
- Product YAML still has a **flat** `tools` list; agent UI only filters which subset you edit.
