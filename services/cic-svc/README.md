# cic-svc — mock CIC (Trung tâm Thông tin Tín dụng)

Mock of the national credit bureau. Government CIC API is not callable in this
hackathon — this service is a **JSON-seeded mock scorecard** so Credit / Thẩm định
can inquire by CCCD (with customer consent) and get debt group + CIC score.

Read-only structured lookup — **not RAG** (a credit score is a key query, not text search).

- Port: **8300**
- Storage: `seed/cic_records.json` (no SQL)
- Scorecard: FICO-style weights → logistic PD → scale **[403, 706]**
- Unknown CCCD → `_default` (demo never breaks)
- Agent wiring: **not done here** (another member owns `apps/api` tool)

## Consent (BR-03)

Lookup requires `consent_granted: true`. Without it the service returns **403** —
CCCD must not be sent to CIC without `CIC_INQUIRY` consent.

## Scorecard (mock)

| Component | Weight | Encoded from seed |
|-----------|--------|-------------------|
| Payment history | 35% | `max_overdue_days`, `overdue_amount_vnd` |
| Utilization | 30% | `total_outstanding_vnd` / `credit_limit_total_vnd` (>30% penalized) |
| Credit history length | 15% | `credit_history_months` |
| Credit mix | 10% | `credit_types` ∈ {secured, unsecured, card} |
| New credit / inquiries | 10% | `inquiries_last_6m` |

Pipeline (`app/services/scoring.py`):

1. Encode each field → \(X_i \in [0,1]\)
2. \(Z = \sum \beta_i X_i\)
3. \(PD = 1 / (1 + e^{k(Z-0.5)})\)
4. \(Score = Offset + Factor \cdot \ln((1-PD)/PD)\) clipped to **[403, 706]**

`cic_group` (1–5) is derived from `max_overdue_days` (debt classification), not from the FICO score alone.

## API

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/health` | — | `{status, seeded_cccds[]}` |
| `POST` | `/lookup` | `{cccd, consent_granted}` | identity + group + score + PD + breakdown |

### CIC groups (TT02/2013 · TT31/2024)

| Group | Classification | Seed overdue |
|-------|----------------|--------------|
| 1 | Nợ đủ tiêu chuẩn | 0 days |
| 2 | Nợ cần chú ý | 1–90 |
| 3 | Nợ dưới tiêu chuẩn | 91–180 |
| 4 | Nợ nghi ngờ | 181–360 |
| 5 | Nợ có khả năng mất vốn | >360 |

Groups **3–5** ⇒ `has_bad_debt: true` (typical hard decline).

## Seed CCCDs (demo)

| CCCD | Group | Name |
|------|-------|------|
| `001099000001` | 1 | NGUYỄN VĂN AN |
| `001099000002` | 2 | NGUYỄN THỊ BÍCH |
| `001099000003` | 3 | NGUYỄN MINH CƯỜNG |
| `001099000004` | 4 | NGUYỄN THỊ DIỆU |
| `001099000005` | 5 | NGUYỄN QUANG ĐỨC |
| anything else | 1 (default) | Khách hàng mặc định (dữ liệu tổng hợp) |

Credit History fields (schema 2.0): `customer_id`, `debt_group`, `outstanding_debt`,
`overdue_history` (`count` / `max_days` / `amount_vnd`), `number_of_institutions`.
`cic_group` remains an alias of `debt_group` for existing consumers.

Scores are **computed** from seed fields (not hard-coded). Expect ~650+ for group 1, lower as risk rises.

## Run

```bash
cd services/cic-svc
pip install -r requirements.txt
uvicorn app.main:app --port 8300 --reload
pytest -q
```

```bash
curl -s http://127.0.0.1:8300/lookup -H "content-type: application/json" \
  -d "{\"cccd\":\"001099000001\",\"consent_granted\":true}"
```

## Storage / Env

- **Seed:** `seed/cic_records.json` (git-versioned, read-only). No DB.
- **Env:** none required. Called by the orchestrator via `CIC_SVC_URL`.
- Production: replace the seed with the real CIC API or a managed reference DB.

## Agent wiring

Not done here — Credit agent tool (`apps/api/src/agents/tools/cic.py`) still uses
`customer_name`. When ready, call this service with:

```json
{"cccd": "<12 digits>", "consent_granted": true}
```

and map `CIC_SVC_URL` → `http://127.0.0.1:8300`.
