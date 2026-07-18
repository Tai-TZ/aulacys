# Handoff — Compliance wow-path veto fix

- **Date:** 2026-07-19
- **Author:** Cursor agent
- **Branch / PR:** `fix/compliance-veto-wow-path` → develop
- **Status:** ✅ Done

## What changed & why
Restored the protected demo branch: purpose contradiction now yields a **blocking** Compliance veto (then Planner replan), instead of an unverified warning that never flipped `veto`. KYC/UBO rules are in both profiles; prohibited-purpose applies to secured **and** unsecured. Consent fail-closed mirrors Credit. Missing doc checklist no longer invents `docs_complete=1`.

## Files touched
- `packages/shared/aulacys/policy/rules/retail_lending.yaml` — purpose + land_title `verified: true`
- `services/policy-svc/rules/retail_lending.yaml` — synced copy
- `packages/shared/aulacys/policy/profiles.py` — KYC/UBO + purpose in `_COMMON`
- `packages/shared/aulacys/agents/nodes/compliance.py` — consent, docs fail-closed, reads metadata
- `packages/shared/tests/test_agents/test_graph.py` — mortgage + unsecured veto assertions
- `packages/shared/tests/test_policy/test_loader.py` — purpose is stage-verified blocking

## How to run / verify
```bash
cd packages/shared
python -m pytest tests/test_agents/test_graph.py tests/test_policy/test_loader.py tests/ -q
```

Expected: mortgage / unsecured veto seeds → `compliance.veto is True`, `veto_fired`, outcome `vetoed`.

## Contract impact
None (behavior + policy data only).

## Follow-ups / TODO
- [ ] Add a clean mortgage seed (no purpose contradiction) for HITL-without-veto demos
- [ ] Cite real legal article text for purpose rule when available; keep `verified` honest

## Gotchas
Loader still downgrades **unverified legal** rows to warning — do not set wow hard-limits back to `verified: false` or the replan edge dies again. Unsecured happy path must not include `purpose_evidence` with "tất toán".
