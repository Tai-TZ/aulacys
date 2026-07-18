# property-svc

Mock of collateral valuation + land registry (a real bank uses an independent appraiser
and the Văn phòng Đăng ký Đất đai). Owns seeded parcels; the orchestrator's Operations
agent values collateral, checks the registry, and runs a document checklist.

## Role

Read-only structured lookup — **not RAG**. Mirrors real external systems (appraiser +
government registry).

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | liveness + seeded parcels |
| `POST` | `/valuation` | `{parcel_id}` → `{valuation, …}` (drives LTV) |
| `POST` | `/land-registry` | `{parcel_id}` → dispute / zoning flags |
| `POST` | `/doc-checklist` | required-document status |

## Run

```bash
cd services/property-svc
pip install -r requirements.txt
uvicorn app.main:app --port 8330
```

## Storage / Env

- **Seed:** `seed/parcel.json` (parcel, valuation, dispute, zoning). No DB.
- **Env:** none required. Called via `PROPERTY_SVC_URL`.
- Production: real appraiser API + registry API.
