<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Fix assess 500 float(None) on audit write

- **Date:** 2026-07-19
- **Author:** Cursor agent (Tai)
- **Branch / PR:** local on develop (uncommitted unless merged)
- **Status:** ✅ Done

## What changed & why

`POST /api/v1/assess/application` returned **500** with
`float() argument must be a string or a real number, not 'NoneType'` when the
full stack set `AUDIT_SVC_URL`. Policy missing-metric violations correctly set
`actual=None` (fail-closed); `post_audit` then called `float(None)` *before*
its HTTP try/except, crashing the whole assess path after Compliance had already
finished. Fixed by treating audit as best-effort end-to-end and skipping ledger
rows that lack numeric `actual`/`threshold` (audit-svc requires floats).

Also stopped the UI from writing `amount=0` / null rate into the form when Credit
proposal returns a zero/empty limit (so the inline fallback body stays usable
when application-svc is down).

## Files touched

- `packages/shared/aulacys/agents/audit_client.py` — guard None; wrap payload build; skip non-numeric rows
- `packages/shared/tests/test_agents/test_audit_client.py` — regression tests
- `apps/web/components/admin/assess-dashboard.tsx` — `applyProposalToForm` ignores ≤0 limit

## How to run / verify

```bash
# unit
cd packages/shared && python -m pytest tests/test_agents/test_audit_client.py -q

# stack (full profile sets AUDIT_SVC_URL — required to reproduce the old bug)
.\scripts\stack.ps1 up -Profile full -Force

# mortgage assess (inline body; application-svc optional if product+declared present)
curl -X POST http://127.0.0.1:8000/api/v1/assess/application \
  -H "Content-Type: application/json" \
  -d "{\"product\":\"retail_mortgage\",\"declared\":{\"customer_name\":\"X\",\"amount\":800000000,\"term_months\":180,\"annual_rate\":0.105,\"monthly_income\":25000000,\"declared_purpose\":\"mua_nha\"}}"
```

Expected: **200**, typically `outcome=vetoed` / `veto_fired=true` for the wow-flow
purpose-contradiction path — not 500.

## Contract impact

none

## Follow-ups / TODO

- [ ] Optionally allow `metric_value: null` in audit-svc schema so missing-metric vetoes are ledgered, not skipped
- [ ] Add `application-svc` to `scripts/stack.ps1` full profile (currently defaults URL `:8360` but stack does not start it)
- [ ] Restart any long-lived orchestrator after pulling this — uvicorn `--reload` does not always pick up `packages/shared` edits

## Gotchas

- The crash only appears when **`AUDIT_SVC_URL` is set** (full profile / Cloud Run). Demo profile without audit never hit it.
- Missing-metric violations still appear in the **assess response**; only the audit HTTP payload omits them.
- Do not call `float(v.actual)` anywhere else on `PolicyViolation` without a None guard — `actual` is intentionally optional.
