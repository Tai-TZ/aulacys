<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Unsecured appraisal criteria in business flow doc

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** `feat/admin_page` / related to #30
- **Status:** ✅ Done (docs only)

## What changed & why

Expanded stage **Thẩm định** in [`docs/FLOW-BUSINESS-CONFIRMED.md`](../FLOW-BUSINESS-CONFIRMED.md)
with the team’s personal unsecured lending appraisal criteria: pháp lý & nhân khẩu (age, eKYC,
geo), phương án (cap 10–12× income / ≤500tr, term bands), khả năng trả nợ (regional min income,
DTI by income band, disposable buffer). Numbers stay out of LLM prompts — note to encode in
`policy/` / product YAML when wiring.

## Files touched

- `docs/FLOW-BUSINESS-CONFIRMED.md` — §3.A–3.D + DTI cross-ref + decided bullet #6

## How to run / verify

```bash
# Read-only docs
# Open docs/FLOW-BUSINESS-CONFIRMED.md §3 and confirm tables match the brief
```

## Contract impact

none

## Follow-ups / TODO

- [ ] Encode DTI bands + income floors + amount ceiling in `policy/rules/retail_lending.yaml` / product YAML
- [ ] Wire age-at-maturity + eKYC score + geo radius tools (mock OK for demo)
- [ ] Disposable income buffer as deterministic tool output for Critic

## Gotchas

- Age rule is **at loan maturity**, not only at application date.
- DTI band caps (35% / 45% / 50–55%) supersede the generic Home Credit “&lt;36% ideal” table for this product.
- Geo 30–50 km and eKYC may remain demo-skipped until KYC/geo services exist.
