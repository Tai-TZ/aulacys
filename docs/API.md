# Backend API — reference for the frontend

Source of truth for shapes = `apps/api/src/models/schemas.py`. Mirror them in
`apps/web/lib/api.ts` (`AGENTS.md` §1 "one contract"). Live docs while the server
runs: `http://localhost:8000/docs` (Swagger) · `/openapi.json`.

- **Base URL:** `http://localhost:8000` (frontend uses `NEXT_PUBLIC_API_URL`).
- **CORS:** allows `http://localhost:3000` (configurable via `CORS_ORIGINS`).
- **Content type:** `application/json; charset=utf-8`. Send UTF-8 — Vietnamese
  diacritics in a mis-encoded body return `422`.

---

## Live endpoints

### `GET /health`
Liveness + DB status. Never 500s (demo-proof).
```json
{ "status": "ok", "env": "development", "db": "disabled" }
```
`db` is `disabled` when no `DATABASE_URL` is set; `up`/`down` otherwise.

### `GET /api/v1/status`
```json
{ "status": "ready" }
```


### `GET http://localhost:8080/status` - gateway service board
Frontend service monitor reads this through `getServiceStatus()` in
`apps/web/lib/api.ts`.

```jsonc
{
  "status": "ok",
  "checked_at": "2026-07-18T00:00:00+00:00",
  "summary": { "total": 9, "up": 9, "down": 0 },
  "services": [
    {
      "name": "api-gateway",
      "url": "self",
      "status": "up",
      "latency_ms": 0,
      "critical": true,
      "detail": { "status": "ok" },
      "error": null
    }
  ]
}
```

`status` is `degraded` if any service healthcheck fails. This endpoint must not
crash the frontend; unavailable services appear as `status: "down"` items.

### `POST /api/v1/chat` - summary endpoint
**Request** (`ChatRequest`):
```json
{ "message": "retail mortgage" }
```
`message`: 1–5000 chars, required.

**Response** (`ChatResponse`):
```json
{ "response": "retail_mortgage: Compliance veto on prohibited_purpose_refinance_other_bank. Planner replanned 2 time(s), escalated to human after replan cap; Critic passed=True; ticket=..." }
```

**Errors:** `422` invalid body · `500` `{ "detail": "<message>" }` on agent failure.

**Demo seed triggers** (no real upload yet — the message picks a seeded file):
| Message contains | Product seeded | Flow |
| ---------------- | -------------- | ---- |
| `tín chấp` or `unsecured` | `retail_unsecured_salary` | lane 1, no veto, no Critic |
| anything else (e.g. `retail mortgage`) | `retail_mortgage` | lane 3, veto → replan ×2 → escalate, Critic runs |

> ℹ️ **`/chat` returns only the summary string.** For the dashboard (veto, lane,
> replan count, per-node trace) use `POST /api/v1/assess` below.

---

## `POST /api/v1/assess` - structured run result (LIVE)

Feeds the dashboard (`BUILD-GUIDE.md` section 8.1 "Monitor is the product").
Source of truth is `apps/api/src/models/schemas.py`; the frontend mirror is
`apps/web/lib/api.ts`.

**Request** (`ChatRequest`):
```json
{ "message": "retail mortgage" }
```

**Response** (`AssessResponse`):
```jsonc
{
  "response": "retail_mortgage: Compliance veto ...",
  "outcome": "vetoed",
  "run_trace": {
    "total_cost": 0.0,
    "lane": 3,
    "replan_count": 2,
    "veto_fired": true
  },
  "credit": {
    "dti": 0.3878,
    "income": 85000000,
    "recommendation": "review",
    "evidence": [
      { "source": "cic_lookup", "reference": "seeded CIC snapshot", "excerpt": "" }
    ],
    "tool_results": {
      "cic_lookup": { "score_band": "A", "overdue_days": 0, "active_loans": 1 },
      "income_verify": { "verified_monthly_income": 85000000, "variance": 0 }
    }
  },
  "operations": {
    "valuation": 4000000000,
    "doc_status": "complete",
    "missing": [],
    "legal_flags": [],
    "evidence": [
      { "source": "property_valuation", "reference": "seeded valuation", "excerpt": "" }
    ],
    "tool_results": {
      "property_valuation": { "valuation": 4000000000 },
      "land_registry": { "clear": true, "legal_flags": [] }
    }
  },
  "compliance": {
    "veto": true,
    "rule_ids": ["prohibited_purpose_refinance_other_bank"],
    "violations": [
      { "rule_id": "...", "effective_from": "2026-01-01", "is_blocking": true }
    ],
    "citations": [],
    "tool_results": {}
  },
  "trace": [
    { "node": "planner", "model": "deterministic-config", "tool_calls": [], "fallback_fired": true },
    { "node": "credit", "model": "deterministic-fallback", "tool_calls": ["cic_lookup", "compute_dti"], "fallback_fired": true },
    { "node": "operations", "model": "deterministic-fallback", "tool_calls": ["property_valuation", "land_registry"], "fallback_fired": true },
    { "node": "compliance", "model": "deterministic-fallback", "tool_calls": ["aml_screen"], "fallback_fired": true }
  ],
  "ticket": { "ticket_id": "...", "status": "vetoed" },
  "audit": null
}
```

### Frontend read map

- Lane badge: `run_trace.lane`.
- Veto banner: `compliance.veto` and `compliance.rule_ids`.
- Replan counter: `run_trace.replan_count`.
- Credit panel: `credit.dti`, `credit.income`, and
  `credit.tool_results.cic_lookup.score_band`.
- Operations panel: `operations.valuation`, `operations.doc_status`, and
  `operations.legal_flags`.
- Node timeline: `trace[]`, especially repeated `compliance` entries in the
  mortgage veto/replan flow.
- Ticket/action result: `ticket.status`, `ticket.ticket_id`, and `audit` when
  `AUDIT_SVC_URL` is set.

Client helper:

```ts
import { assess } from "@/lib/api";

const run = await assess("retail mortgage");
console.log(run.credit?.dti, run.operations?.valuation);
```

### Contract rules

- Frontend must import types from `apps/web/lib/api.ts`; do not recreate response
  shapes in components.
- Backend contract changes start in `apps/api/src/models/schemas.py`, then mirror
  in `apps/web/lib/api.ts` in the same commit.
- Do not expose the raw LangGraph state. Add narrow response fields only when the
  dashboard needs them.
