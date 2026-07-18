# Handoff — cic-svc mock scorecard + consent

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** local (not pushed)
- **Status:** ✅ Done

## What changed & why

Real CIC is government-gated, so `cic-svc` needed a **module-level mock** for Thẩm định: lookup by CCCD only, require customer consent, and compute a CIC score from seeded bureau fields (not hard-coded integers). Scorecard follows the team brief: FICO-style weights → logistic PD → normalize to **[403, 706]**. Agent tool wiring is intentionally left alone.

## Files touched

- `services/cic-svc/app/services/scoring.py` — encode + PD + CIC score formula
- `services/cic-svc/app/services/cic.py` — consent gate + scorecard lookup
- `services/cic-svc/app/schemas/cic.py` — `{cccd, consent_granted}` + richer response
- `services/cic-svc/app/api/routes.py` — 403 when consent missing
- `services/cic-svc/seed/cic_records.json` — identity / debt / payment / inquiry fields
- `services/cic-svc/tests/test_lookup.py` — scorecard + consent + groups 1–5
- `services/cic-svc/README.md` — contract + formula docs
- `services/cic-svc/app/core/config.py` — version bump `0.4.0`

## How to run / verify

```bash
cd services/cic-svc
pytest -q
# expect: 9 passed

uvicorn app.main:app --port 8300 --reload

curl -s http://127.0.0.1:8300/lookup -H "content-type: application/json" \
  -d "{\"cccd\":\"001099000001\",\"consent_granted\":true}"
# score in [403,706], cic_group=1, full_name=Nguyen Van An

curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8300/lookup \
  -H "content-type: application/json" \
  -d "{\"cccd\":\"001099000001\",\"consent_granted\":false}"
# expect: 403
```

## Contract impact

- **Monolith contract** (`apps/api/src/models/schemas.py` / `apps/web/lib/api.ts`): **none**
- **cic-svc HTTP contract** (service-local): **changed**
  - Request now requires `consent_granted: bool`
  - Response adds `full_name`, `pd`, debt/inquiry fields, `score_breakdown`; `score` is now **[403, 706]** (was up to ~820 hard-coded)

## Follow-ups / TODO

- [ ] Wire `apps/api/src/agents/tools/cic.py` to `POST /lookup` with `{cccd, consent_granted}` (still uses `customer_name` today)
- [ ] Pass consent from application / KYC flow (BR-03) before Credit calls CIC
- [ ] Optional: gateway OpenAPI note for the new request body

## Gotchas

- **Consent is mandatory** — old curls with only `{cccd}` return **422**; without `consent_granted: true` → **403**.
- **`cic_group` ≠ score band.** Group comes from `max_overdue_days` (debt classification). Score is independent PD odds on [403, 706].
- Seed CCCDs `001099000001`…`005` still map to groups 1…5 via overdue days; scores are computed each call.
- Do not hard-code scores back into the seed — edit raw fields and let `scoring.py` recompute.
