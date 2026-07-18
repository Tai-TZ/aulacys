# Handoff — P1 policy version + LLM harness slot

- **Date:** 2026-07-18
- **Author:** Cursor agent
- **Branch / PR:** `feat/p1-policy-version-llm` → `develop`
- **Status:** ✅ Done

## What changed & why

P1 from `docs/CODING-PLAN.md`: (1) Điều 136 2026 thresholds verified at **13% / 21%** with real `version` on rules + violations for the audit ledger; (2) harness `runner.run` calls the LLM when `OPENAI_API_KEY` is set, otherwise deterministic `spec.fallback` (demo-proof). Demo `prohibited_purpose_*` stays `verified: false` until a real article is cited — badge it in UI (P0 dashboard).

## Files touched

- `apps/api/src/policy/rules/*.yaml` + `services/policy-svc/rules/*.yaml` — thresholds + `version`
- `apps/api/src/policy/loader.py` + `services/policy-svc/app/policy.py` — `version` on rule/violation
- `apps/api/src/agents/audit_client.py` — `rule_version` from `v.version`
- `apps/api/src/agents/harness/runner.py` — LLM slot + fallback
- `apps/api/tests/test_policy/test_loader.py` + `tests/test_agents/test_runner.py`

## How to run / verify

```bash
cd apps/api
D:\aiinovation\.venv\Scripts\python.exe -m pytest -q
# expect: 57 passed
```

Without `OPENAI_API_KEY`, mortgage veto still works via fallback. With a key, agents attempt structured LLM then fall back on error.

## Contract impact

None on HTTP schemas. Policy violation JSON gained `version` (already nested under compliance). Audit payload now sends real `rule_version`.

## Follow-ups / TODO

- [ ] Add 2027 Điều 136 rows (12% / 19%) before 2027-01-01
- [ ] Cite real legal article for `prohibited_purpose_refinance_other_bank` or keep UI badge "unverified"
- [ ] Wire unverified badge on `/admin` after P0 PR #14 merges
- [ ] P1.4 RAG (blocked until rule_ids stable — mostly done for Điều 136)
- [ ] Consider stronger Planner model than `gpt-4o-mini` (team decision)

## Gotchas

- Thresholds are **year-scoped** (`effective_to: 2026-12-31`). Do not leave them open-ended.
- Source: Luật 32/2024/QH15 Điều 136 khoản 1 điểm b (2026 schedule). Do not re-ask an LLM for the number.
- `load_rules` is `@lru_cache` — restart process after editing YAML.
