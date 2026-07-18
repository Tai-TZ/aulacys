# Handoff — legal-svc mock police / court blacklist

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** feat/admin_page (or current) — local
- **Status:** ✅ Done (module only; agent tool not wired)

## What changed & why

Compliance needs a domestic **legal / police blacklist** screen separate from AML
(sanctions/PEP). Real C06 / court APIs are unavailable, so `legal-svc` is a
JSON-seeded mock: lookup by CCCD (+ optional name) → `CLEAR` / `HIT` / `POSSIBLE_HIT`.

## Files touched

- `services/legal-svc/` — new service (port **8370**): schemas, check logic, seed, tests, README
- `services/api-gateway/app/main.py` — health monitor entry
- `docker-compose.yml` / `docker-compose.services.yml` — service + `LEGAL_SVC_URL`
- `services/README.md`, `docs/MICROSERVICES-STATUS.md` — inventory

## How to run / verify

```bash
cd services/legal-svc
pip install -r requirements.txt
pytest -q
# expect: 8 passed

uvicorn app.main:app --port 8370 --reload

curl -s http://127.0.0.1:8370/check -H "content-type: application/json" \
  -d "{\"cccd\":\"001099000010\"}"
# result=HIT, blocking=true, list=police_wanted

curl -s http://127.0.0.1:8370/check -H "content-type: application/json" \
  -d "{\"cccd\":\"001099000001\"}"
# result=CLEAR
```

## Contract impact

- Monolith `schemas.py` / `apps/web/lib/api.ts`: **none**
- New service-local contract: `POST /check` `{cccd, full_name?}`

## Follow-ups / TODO

- [ ] Wire Compliance tool: `LEGAL_SVC_URL` + `POST /check` (do not overload `aml_screen`)
- [ ] Pass CCCD from application / KYC into the tool args
- [ ] Policy rule: `legal_blacklist_hit` → blocking veto when `blocking=true`

## Gotchas

- **Not AML.** `aml-svc` = international sanctions/PEP. This = police wanted / court / bank legal list.
- Name-only match → `POSSIBLE_HIT` (soft). Hard decline only when CCCD hit has `severity: blocking`.
- Unknown CCCD → `CLEAR` (demo-proof), same pattern as cic-svc `_default`.
