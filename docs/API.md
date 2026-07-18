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

### `POST /api/v1/chat`  ← the only functional endpoint today

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

| Message contains                        | Product seeded              | Flow                                                |
| --------------------------------------- | --------------------------- | --------------------------------------------------- |
| `tín chấp` or `unsecured`         | `retail_unsecured_salary` | lane 1, no veto, no Critic                          |
| anything else (e.g.`retail mortgage`) | `retail_mortgage`         | lane 3, veto → replan ×2 → escalate, Critic runs |

> ℹ️ **`/chat` returns only the summary string.** For the dashboard (veto, lane,
> replan count, per-node trace) use `POST /api/v1/assess` below.

---

## `POST /api/v1/assess`  ← structured run result (LIVE)

Feeds the dashboard (`BUILD-GUIDE.md` §8.1 "Monitor is the product"). Shapes reuse
`apps/api/src/agents/state.py` (`RunTrace`, `NodeTrace`, `ComplianceVerdict`) and are
mirrored in `apps/web/lib/api.ts` (`AssessResponse`, `assess()`).

**Request:** same `{ "message": "..." }`. Real `LoanApplication` input uses
`POST /api/v1/assess/application`.

**Response** (`AssessResponse`):

```jsonc
{
  "response": "…human-readable summary…",
  "outcome": "vetoed",                    // stp_approved | vetoed | ready_for_human_approval
  "run_trace": {
    "total_cost": 0.0,
    "lane": 3,                            // 1 = rule-only · 2 = cheap · 3 = mortgage/veto
    "replan_count": 2,
    "veto_fired": true
  },
  "proposal": {
    "requested_amount": 2500000000,
    "proposed_limit": 2500000000,
    "proposed_rate": 0.108,
    "term_months": 240,
    "monthly_payment": 24958000.0,
    "dti": 0.3878,
    "status": "revised",                  // accepted | revised | rejected
    "revisions": ["Rate revised by product pricing config"]
  },
  "credit": {
    "dti": 0.3878,
    "proposed_limit": 2500000000,
    "proposed_rate": 0.108,
    "recommendation": "support"
  },
  "compliance": {
    "veto": true,
    "rule_ids": ["prohibited_purpose_refinance_other_bank"],
    "violations": [
      { "rule_id": "...", "effective_from": "2023-09-01", "legal_basis": "...", "is_blocking": true }
    ]
  },
  "trace": [                              // one entry per node execution (for the timeline)
    { "node": "planner",    "model": "deterministic-config",   "tool_calls": [],              "fallback_fired": true },
    { "node": "credit",     "model": "deterministic-fallback", "tool_calls": ["cic_lookup","compute_dti"], "fallback_fired": true },
    { "node": "compliance", "model": "deterministic-fallback", "tool_calls": ["aml_screen"],  "fallback_fired": true }
    // mortgage: compliance appears 3× (initial + 2 replans)
  ],
  "ticket": { "ticket_id": "...", "status": "vetoed" }
}
```

### UI this unlocks

- **Lane badge** (`run_trace.lane`) + **veto banner** (`compliance.veto` + `rule_ids`).
- **Replan counter** — show the loop ran `replan_count` times then escalated.
- **Node timeline** from `trace[]` — the repeated `compliance` entries visualize the veto→replan loop; this is the money shot for judges.
- **Cost/latency** per node once `meter` emits real numbers (currently 0).

Client helper: `import { assess } from "@/lib/api"` → `const run = await assess(msg)`.
