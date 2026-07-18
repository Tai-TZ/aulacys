# Handoff — Seed 7 loan dossiers to Postgres

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** develop (local)
- **Status:** ✅ Done

## What changed & why

Seeded application intake DB with 3 wow-flow demos + 4 CCCD dossiers (Đặng Thị Trắng, Nguyễn Quốc Việt, Nguyễn Minh Quen, Trần Thị Hồng Phúc). Schema was empty (`loan_application` = 0); UI still used in-memory mock.

## Files touched

- `services/application-svc/seed/dossiers.py` — seed payloads
- `services/application-svc/scripts/seed_dossiers.py` — idempotent runner (by CCCD)
- `services/application-svc/app/db/engine.py` — `make_url` + strip `pgbouncer` for psycopg
- `services/application-svc/README.md` — seed command

## How to run / verify

```bash
cd services/application-svc
python scripts/seed_dossiers.py
# expect: created=0 skipped=7 total_loan_application=7 on second run
```

## Contract impact

none

## Follow-ups / TODO

- [ ] Wire admin bộ hồ sơ list to `GET` application-svc instead of `baselineDossiers` mock
- [ ] Loan/phone/income for new CCCD rows are demo fills (not on the card)

## Gotchas

- Seed prefers `DIRECT_URL` (session pooler). Runtime `DATABASE_URL` with `pgbouncer=true` breaks raw psycopg unless stripped (engine now strips it).
- Re-run is safe: skips existing `id_number`.
