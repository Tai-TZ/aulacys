# legal-svc — mock legal / police blacklist (Vietnam)

Real police / court APIs are not callable in this hackathon. This service is a
**JSON-seeded mock** so Compliance / Thẩm định can screen a customer for:

- **police wanted** lists (Cục Cảnh sát / C06-style)
- **court criminal judgments**
- **bank internal** legal blacklist

Distinct from `aml-svc` (international sanctions / PEP under PCRT).

- Port: **8370**
- Storage: `seed/legal_records.json` (no SQL)
- Unknown CCCD → `CLEAR` (demo never breaks)
- Agent wiring: **not done here**

## API

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/health` | — | list sizes + seeded CCCDs |
| `POST` | `/check` | `{cccd, full_name?}` | `result`, `blocking`, `matches[]` |

### Result codes

| `result` | Meaning |
|----------|---------|
| `CLEAR` | No hits |
| `HIT` | CCCD matched a seeded record |
| `POSSIBLE_HIT` | Name-only soft match (no CCCD hit) |

`blocking: true` / `is_blacklisted: true` only when a **CCCD** hit has `severity: blocking`
(typical hard decline). Name-only or `review` severity → soft flag.

## Seed CCCDs (demo)

| CCCD | Result | Notes |
|------|--------|-------|
| `001099000001` | CLEAR | Clean customer |
| `001099000010` | HIT blocking | Police wanted |
| `001099000011` | HIT blocking | Court judgment |
| `001099000012` | HIT review | Bank internal watch |
| `001099000013` | HIT blocking | Multi-list |
| `999999999999` + name `Nguyen Van Ghost` | POSSIBLE_HIT | Name-only |
| anything else | CLEAR | `_default` |

## Run

```bash
cd services/legal-svc
pip install -r requirements.txt
uvicorn app.main:app --port 8370 --reload
pytest -q
```

```bash
curl -s http://127.0.0.1:8370/check -H "content-type: application/json" \
  -d "{\"cccd\":\"001099000010\"}"
```

## Storage / Env

- **Seed:** `seed/legal_records.json` (git-versioned). No DB.
- **Env:** none required. Orchestrator should call via `LEGAL_SVC_URL`.
- Production: replace seed with real C06 / court / internal blacklist APIs behind the same `/check` shape.

## Agent wiring

Not done here. When ready, Compliance (or a dedicated legal tool) should call:

```json
POST {LEGAL_SVC_URL}/check
{"cccd": "<12 digits>", "full_name": "<optional>"}
```

Do **not** fold this into `aml-svc` — AML = sanctions/PEP; this = domestic legal blacklist.
