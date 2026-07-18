# cic-svc

Mock of the national credit bureau (**CIC** — Trung tâm Thông tin Tín dụng Quốc gia).
Owns seed reference data; the orchestrator's Credit agent looks up a customer's score by
name. Unknown customers get a clean default record so the demo never breaks.

## Role

Read-only structured lookup — **not RAG** (a credit score is a key query, not text search).
Mirrors a real external bank integration (the CIC API).

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | liveness + seeded customer count |
| `POST` | `/lookup` | `{customer_name}` → `{score_band, overdue_days, active_loans, source, computed_at}` |

## Run

```bash
cd services/cic-svc
pip install -r requirements.txt
uvicorn app.main:app --port 8300
curl -s localhost:8300/lookup -H 'content-type: application/json' -d '{"customer_name":"Tran Thi B"}'
```

## Storage / Env

- **Seed:** `seed/cic_records.json` (git-versioned, read-only). No DB.
- **Env:** none required. Called by the orchestrator via `CIC_SVC_URL`.
- Production: replace the seed with the real CIC API or a managed reference DB.
