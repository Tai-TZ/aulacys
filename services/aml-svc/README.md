# aml-svc

Mock of sanctions / PEP and related-party screening (a real bank uses a vendor like
World-Check). Owns seeded screening lists; the orchestrator's Compliance agent screens a
customer and checks related-party exposure.

## Role

Read-only structured screening — **not RAG**. Related-party (who owns/controls whom) is
graph-shaped; production would back it with a graph DB. Mirrors a real external vendor.

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/health` | liveness + list sizes |
| `POST` | `/screen` | `{sanctions_match_count?, pep_match_count?, customer_name?}` → match counts (name hit bumps to ≥1) |
| `POST` | `/related-party` | `{exposure_ratio_related_group}` → echoed with `source` |

## Run

```bash
cd services/aml-svc
pip install -r requirements.txt
uvicorn app.main:app --port 8320
```

## Storage / Env

- **Seed:** `seed/aml_lists.json` (`sanctions_list`, `pep_list`). No DB.
- **Env:** none required. Called via `AML_SVC_URL`.
- Production: real screening vendor API; related-party → graph DB (Neo4j).
