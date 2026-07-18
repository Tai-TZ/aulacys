# Data, storage & integrity — the definitive map

> Verified by code inspection (not doc claims). If this disagrees with any other
> doc, this file wins for "which service stores what".

## 1. Storage per service — DEFINITIVE

| Service | Storage kind | Backing | Owns / mutates? | Integrity need |
| ------- | ------------ | ------- | --------------- | -------------- |
| **audit-svc** | transactional DB | **Postgres only** (`DATABASE_URL`, schema `audit`) | append-only ledger | **HIGH — hash chain + triggers** |
| **los-svc** | transactional DB | **Postgres only** (`DATABASE_URL`, schema `los`) | upsert tickets + history | low (mutable record) |
| **policy-svc** | config files | `rules/*.yaml` (`lru_cache`) | read-only | git + `verified` flag |
| **cic-svc** | reference/seed | `seed/cic_records.json` | read-only | git (static) |
| **aml-svc** | reference/seed | `seed/aml_lists.json` | read-only | git (static) |
| **property-svc** | reference/seed | `seed/parcel.json` | read-only | git (static) |
| **income-svc** | **none** | — | pure compute (stateless) | n/a |
| **catalog-svc** | reference/seed | `seed/catalog.json` | read-only | git (static) |
| **api-gateway** | **none** | — | proxy + `/status` monitor | n/a |
| **agent-worker-svc** | **none** | — | compute worker | n/a |

1. **Transactional DB** (state changes): `audit-svc`, `los-svc` — **Postgres only** (see `CONFIG.md`).
2. **Reference / seed** (read-only lookup): `cic`, `aml`, `property` (JSON), `policy` (YAML). Ships in the image, versioned in git.
3. **Stateless** (no storage): `income`, `api-gateway`, `agent-worker`.

Only **2 services own mutable data**. Everything else is read-only or stateless.

## 2. Audit ownership — resolved

**(A) audit-svc is authoritative.** It owns the Postgres ledger (schema `audit`).
The monolith's `migrations/0001_audit_chain` / `db/models/audit.py` are **orphaned** —
no writer in the monolith; park or delete later so nobody thinks the monolith writes audit.
SQLite fallback was **removed** (team decision; see `CONFIG.md`).


## 3. Integrity — what needs it, and proof it works

Only the **audit ledger** needs tamper-evidence (it is the inspector's record). Verified:

```
BEFORE tamper : {"intact": true,  "records": 3}
# raw SQLite: UPDATE audit_record SET outcome='approved' WHERE seq=2
AFTER  tamper : {"intact": false, "broken_at_seq": 2}
```

So even with **direct DB write access** (no trigger in SQLite), the hash chain catches
the edit: each record's `content_hash = sha256(core + prev_hash)`, so changing any row
breaks every hash after it. `GET /verify` walks the chain and reports the first break.

**Integrity by storage class:**
- **audit-svc:** app-level append-only (only INSERT/SELECT exposed) **+ hash chain** (proven above). Prod adds Postgres UPDATE/DELETE triggers (already in `migration 0001`) for defence-in-depth.
- **los-svc:** tickets are meant to change status (upsert) → no chain needed; integrity = normal DB constraints. Add an audit column later if ticket history matters.
- **reference/seed (cic/aml/property/policy):** integrity = the file is in git; `policy` rules also carry `verified` + `version`. No runtime mutation to protect.

## 4. Production storage plan

| Item | Now | Production |
| ---- | --- | ---------- |
| audit-svc store | SQLite file | **Postgres**, append-only + triggers (`migration 0001`), WORM/retention |
| los-svc store | SQLite file | **Postgres**, ticket history table |
| orchestrator run ledger | none (in-memory) | **Postgres** `loan_run` (designed in `ARCHITECTURE-services.md` §12) |
| policy rules | YAML in image | `policy_rule` + `policy_rule_change` history table (versioned, auditable) |
| cic/aml/property seed | JSON in image | real external APIs (CIC/registry/screening) or managed reference DB |
| hash chain | per-record sha256 | + periodic anchor (e.g. daily root hash to a WORM bucket) |

**Migrations rule:** each data-owner runs its **own** Alembic; no cross-service DDL, no
shared database. audit-svc migrates only audit tables, los-svc only tickets.

## 5. How to re-verify (commands)

```bash
# audit integrity (from services/audit-svc)
AUDIT_DB=/tmp/x.db python -c "from app import db; db.init_db(); \
  r={'application_id':'t','product':'p','lane':3,'outcome':'vetoed','veto_fired':True,'replan_count':2,'as_of':'2026-07-18','signed_by':'system'}; \
  [db.append_record(r,[]) for _ in range(3)]; print(db.verify_chain())"

# live: GET /verify on a running audit-svc
curl -s localhost:8200/verify        # {"intact": true, "records": N}
```
