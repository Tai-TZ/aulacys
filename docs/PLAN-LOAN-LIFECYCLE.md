# Plan — Loan Lifecycle (4-stage) on the existing engine

> Maps [`FLOW-PROCESS-LOAN.md`](./FLOW-PROCESS-LOAN.md) (Tiếp nhận → Thẩm định → Phê duyệt →
> Giải ngân) onto the current codebase, gives a concrete **code plan**, folds in the
> demo-relevant fixes from [`PRODUCTION-READINESS.md`](./PRODUCTION-READINESS.md), and tiers
> everything for the hackathon clock.
>
> **Guardrail (`AGENTS.md` §0):** protect the veto→replan branch above all. Everything below
> reuses the existing deterministic engine; nothing rewrites it. Hour-36 rule still applies —
> if a tier threatens the veto demo, cut the tier, not the veto.

---

## 1. Target shape — a lifecycle FSM *around* the existing agent graph

The current graph (`process_application`) is the **appraisal engine**. Do not rebuild it.
Wrap it in a thin application **state machine**; each stage is a transition + a deterministic
tool + (optionally) an LLM prose layer.

```
received ──intake──► appraised ──gate(config)──► {stp_approved | ready_for_human_approval | vetoed}
   │                    │                              │
   │ doc_checklist      │ credit+ops+compliance        │ /approvals (human)
   │ accuracy_check     │ veto→replan (KEEP)           ▼
   │ Credit Memo(LLM)   │ price_loan  ────►  approved ──disburse──► disbursed
   │                    │ gen_contract              re-check CIC + window + book tranche
   └────────────────────┴──────────────────────────────────────────────────────────
   Status persisted in application-svc (or in-memory fallback). One product YAML drives all.
```

**Principle kept:** flow lives in config, numbers/veto in code/policy, LLM writes prose only.

---

## 2. Code plan by stage

### Stage 1 — Tiếp nhận (Intake)

OCR/extraction is **out of scope** (`AGENTS.md` §0). Assume `Document.extracted` is populated
(seed or application-svc). Build the two things the flow actually needs:

- **`accuracy_check` tool** — `apps/api/src/agents/tools/intake.py` (new). Compares
  `declared.*` against `document.extracted.*` (income, name); returns
  `{matches, mismatches[], status}`. Deterministic. Feeds Operations' report and the memo.
- **Credit Memo assembler** — `apps/api/src/agents/tools/credit_memo.py` (new). Deterministic
  compose of a `CreditMemo` object from `credit`/`operations`/`compliance` state (all numbers
  come from tool_results). **LLM writes only the narrative prose fields** (`summary`,
  `rationale`) via a new `MemoSpec` whose `output` is prose-only — this is the correct,
  single place the LLM earns its keep and simultaneously fixes P0-2 (LLM never emits numbers).

New schema (`state.py`):

```python
class CreditMemo(BaseModel):
    application_id: str
    customer_name: str
    amount: float; term_months: int
    dti: float | None; ltv: float | None
    cic_group: int | None; cic_score: int | None
    proposed_rate: float | None          # from price_loan (Stage 2)
    doc_status: str; mismatches: list[str]
    recommendation: str                  # from credit node (tool-derived)
    narrative: str = ""                  # LLM prose ONLY, no numbers
    citations: list[Citation]
```

### Stage 2 — Thẩm định (Appraisal) — mostly exists; add pricing + contract

- **`price_loan` tool** — `apps/api/src/agents/tools/pricing.py` (new). Risk-based:
  `rate = base_rate + group_premium[cic_group] + term_premium(term) + risk_premium`.
  Inputs already available: `cic_group`/`score` (cic scorecard), `term_months`, product config.
  Returns `{proposed_rate, breakdown, inputs, formula}` — traceable, so Critic accepts it.
- **Pricing table in product YAML** (config, not code):
  ```yaml
  pricing:
    base_rate: 0.09
    group_premium: {1: 0.0, 2: 0.02, 3: 0.05}
    term_premium_per_year: 0.001
    risk_premium: 0.01
  ```
- **`gen_contract` tool** — `apps/api/src/agents/tools/contract.py` (new). Renders a contract
  string from a template + priced terms (no OCR, no external). Returns `{contract_id, body, terms}`. Demo-proof mock like `write_approval_ticket`.
- **Wire into graph:** after agents run and no veto, call `price_loan` → `gen_contract` →
  assemble `CreditMemo`. Add `credit_memo`, `pricing`, `contract` to `AgentState` + `AssessResponse`.

### Stage 3 — Phê duyệt (Approval) — small additions

- `/approvals` exists. Extend `ApprovalRequest.decision` to
  `Literal["approved","rejected","needs_more_info"]` (flow doc: "yêu cầu bổ sung hồ sơ").
- Dynamic HITL already config-driven via `gate.stp_when`. Flow doc §"phê duyệt nên để động,
  k fix" ✅ already satisfied — document it, don't rebuild.
- Approval reads the `CreditMemo` + `contract` (pass ids in request).

### Stage 4 — Giải ngân (Disbursement) — new, thin

- **`/disbursements` endpoint** (`routes.py`) + `DisbursementRequest/Response` schema.
- **`check_disbursement` node/tool** — `apps/api/src/agents/tools/disbursement.py` (new):
  1. re-run `cic_lookup` (reuse existing tool) — catches new bad debt since approval.
  2. window check: `approved_at` within 3–6 months (config `disbursement.window_months`).
  3. re-confirm eligibility (no new veto).
     Returns `{eligible, checks[], blocked_reason}`.
- **`book_disbursement` tool** — mock tranche booking (like ticket). Supports multi-tranche
  (`tranche_no`, `amount`). Config `disbursement.auto` → auto-book if no HITL, else route to
  `/approvals` first (matches flow doc branch).

### Cross-cutting — lifecycle status

- Add `status` to the application record: `received | appraised | approved | rejected | needs_info | disbursed`. Persist in **application-svc** (already scaffolded, untracked) with
  in-memory fallback so the demo runs with zero infra (`AGENTS.md` §6).

---

## 3. Fold-in fixes from PRODUCTION-READINESS (demo-synergistic only)

Do these **because they make the demo correct**, not as separate work:

- **P0-2** (LLM out of numbers): solved *by construction* via `MemoSpec` prose-only output.
  Also flip credit/ops/compliance `run()` so the LLM path can't emit the structured verdict —
  route the structured verdict through fallbacks always; LLM only fills `narrative`.
- **P0-3** (reproducibility): `temperature=0` + pin model snapshot in `config.py`. 2-line change.

Defer to post-hackathon (note only, do **not** build now — scope): auth/JWT (P0-4), httpx
async (P0-5), error masking (P0-6), idempotency (P0-7), RAG. RAG is the biggest post-demo
feature; the memo narrative is the seam it will later plug into.

---

## 4. Hackathon tiering (protect the veto)

| Tier                    | Scope                                                                                 | Why                                                               | Est   |
| ----------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----- |
| **T0 — protect** | Don't break veto→replan; add regression test                                         | `AGENTS.md` §0                                                 | 0.5h  |
| **T1 — must**    | `price_loan` + pricing YAML + `CreditMemo` assembler + LLM prose-only (P0-2/P0-3) | Turns "veto demo" into "underwriting demo"; fixes legal inversion | 4–6h |
| **T2 — should**  | `gen_contract` + `accuracy_check` + `needs_more_info`                           | Completes stages 1–3 as visible artifacts                        | 3–4h |
| **T3 — stretch** | `/disbursements` + `check_disbursement` (re-check CIC) + `book_disbursement`    | Full lifecycle; strong close                                      | 3–4h |
| **T4 — if time** | lifecycle`status` in application-svc; web timeline UI                               | Persistence + visual story                                        | 3h+   |

Ship each tier as its own PR + handoff (`AGENTS.md` §2/§5). Every new tool ships with a
deterministic fallback and a test.

---

## 5. Upgraded demo script (one YAML still switches everything)

1. Submit retail mortgage → **Credit Memo** drafted (LLM prose over tool numbers).
2. **Risk-based rate** priced from CIC group/score + term (deterministic, traceable).
3. Compliance **vetoes** on prohibited purpose → Planner **replans** (the protected branch).
4. Human **approves** at the dynamic HITL gate (config, not code).
5. **Disbursement** re-checks CIC + 3–6 month window → books tranche.
6. Swap **one YAML** → unsecured product: different pricing, STP auto-disburse, no veto — no code.

Story: *"Not a chatbot — an underwriting pipeline. Every number is a tool call, every veto is
policy-as-code, the LLM only writes the memo prose, and the whole flow is one config file."*

---

## 6. Risks / scope discipline

- **Biggest risk:** T1–T3 is a lot; wiring can destabilize the veto. Mitigate with T0 regression
  test first, and keep new stages behind config flags (absent config = current behaviour).
- **Scope flag (`AGENTS.md` §1.7):** the 4-stage lifecycle is broader than §0's single "wow
  flow". This plan treats stages 1/2/4 as *thin* additions that reuse the engine — confirm with
  the team before starting T3/T4. If in doubt, T0+T1 alone already delivers a stronger,
  legally-correct demo.
- **Do not** add OCR, real core-banking, a second DB, or new deps (`AGENTS.md` §0/§1.2).

---

## 7. File change summary

```
NEW  apps/api/src/agents/tools/pricing.py        # price_loan (T1)
NEW  apps/api/src/agents/tools/credit_memo.py     # memo assembler (T1)
NEW  apps/api/src/agents/tools/contract.py        # gen_contract (T2)
NEW  apps/api/src/agents/tools/intake.py          # accuracy_check (T2)
NEW  apps/api/src/agents/tools/disbursement.py    # check + book (T3)
NEW  apps/api/src/agents/nodes/memo.py            # MemoSpec, prose-only LLM (T1)
EDIT apps/api/src/agents/state.py                 # CreditMemo, Disbursement, status
EDIT apps/api/src/agents/graph.py                 # wire pricing/memo/contract/disburse
EDIT apps/api/src/agents/products/*.yaml          # pricing:, disbursement: blocks
EDIT apps/api/src/api/routes.py                   # /disbursements, needs_more_info
EDIT apps/api/src/models/schemas.py               # request/response + apps/web/lib/api.ts
EDIT apps/api/src/config.py                        # temperature=0, pin model (P0-3)
EDIT apps/api/src/agents/harness/runner.py         # LLM prose-only guard (P0-2)
```
