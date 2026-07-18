# DB schema catalog — every table, every service, one place

> All tables owned by every DB-owning service. **Source of truth = each service's
> Alembic migration** (`services/<svc>/migrations/versions/0001_*.py`); `schema.sql` is a
> readable snapshot; `app/db/models.py` is the ORM mirror. This catalog is verified
> consistent across the three (2026-07-18).

## Who owns tables

| Schema (Postgres namespace) | Service | Tables | Status |
|-----------------------------|---------|--------|--------|
| `audit` | audit-svc | `audit_record`, `audit_violation` | ✅ built |
| `los` | los-svc | `loan_ticket`, `ticket_history` | ✅ built |
| `orchestrator` | orchestrator-svc | `loan_run` | ⬜ designed, not built |
| (policy) | policy-svc | `policy_rule`, `policy_rule_change` | ⬜ optional (YAML today) |

Schemas created by `services/db/init-schemas.sql`. The other 7 services own **no tables**
(seed/stateless). No cross-schema foreign keys.

---

## schema `audit` — audit-svc

### `audit_record` — one row per decision (append-only, immutable)
| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | uuid | pk | |
| `application_id` | text | no | indexed |
| `product` | text | no | |
| `lane` | integer | no | 1 / 2 / 3 |
| `outcome` | text | no | stp_approved \| vetoed \| ready_for_human_approval |
| `veto_fired` | boolean | no | default false |
| `replan_count` | integer | no | default 0 |
| `as_of` | date | no | policy evaluation date (breakthrough-B) |
| `signed_by` | text | no | `system` \| human id |
| `decided_at` | text | no | ISO string — hashed (byte-stable) |
| `decided_at_ts` | timestamptz | yes | queryable timestamp |
| `seq` | integer | no | indexed; chain order |
| `content_hash` | varchar(64) | no | sha256(core + prev_hash) |
| `prev_hash` | varchar(64) | yes | links previous record |

Indexes: `application_id`, `seq`. **Triggers:** `BEFORE UPDATE OR DELETE → raise` (immutable).

### `audit_violation` — rules fired for a record
| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | uuid | pk | |
| `record_id` | uuid | no | FK → `audit_record.id`, indexed |
| `rule_id` | text | no | |
| `rule_version` | text | no | e.g. `2026.1-dieu136` |
| `effective_from` | date | no | |
| `legal_basis` | text | no | |
| `metric_name` | text | no | dti / ltv / … |
| `metric_value` | double precision | no | **float8** (hash-safe; not REAL) |
| `threshold` | double precision | yes | |
| `is_blocking` | boolean | no | default false |

Index: `record_id`. Same immutability triggers.

---

## schema `los` — los-svc

### `loan_ticket` — system-of-record (mutable, upsert)
| Column | Type | Null | Notes |
|--------|------|------|-------|
| `ticket_id` | text | pk | `DEMO-<app>` |
| `application_id` | text | no | indexed |
| `status` | text | no | indexed; vetoed / ready_for_human_approval / human_approved / … |
| `product` | text | yes | |
| `summary` | text | no | |
| `assigned_to` | text | yes | HITL queue |
| `created_at` | timestamptz | no | |
| `updated_at` | timestamptz | no | |

Indexes: `application_id`, `status`.

### `ticket_history` — status transitions
| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | uuid | pk | |
| `ticket_id` | text | no | FK → `loan_ticket.ticket_id`, indexed |
| `old_status` | text | yes | |
| `new_status` | text | no | |
| `changed_at` | timestamptz | no | |
| `changed_by` | text | yes | |

Index: `ticket_id`.

---

## schema `orchestrator` — orchestrator-svc (⬜ designed, not built)

### `loan_run` — run tracking / trace snapshot (disposable, ≠ audit)
| Column | Type | Notes |
|--------|------|-------|
| `run_id` | uuid pk | |
| `application_id` | text | |
| `product` | text | |
| `lane` | integer | |
| `outcome` | text | |
| `veto_fired` | boolean | |
| `replan_count` | integer | |
| `as_of` | date | |
| `total_cost` | double precision | |
| `trace` | jsonb | NodeTrace[] snapshot (mutable, disposable) |
| `started_at` / `finished_at` | timestamptz | |

Design: `ARCHITECTURE-services.md` §12. Not migrated yet.

## (optional) schema `policy` — policy-svc (⬜ YAML today)
`policy_rule` + `policy_rule_change` (versioned, auditable) — `ARCHITECTURE-services.md`
§13. Only if rules move from YAML into a DB.

---

## Consistency status (checked 2026-07-18)

- ✅ `schema.sql` ↔ `app/db/models.py` ↔ `migrations/0001_*` **match** for all 4 built tables.
- ✅ `metric_value`/`threshold` are **float8** everywhere (hash-chain safe).
- ⚠️ `audit-svc/app/db/models.py` docstring says "mirror of …/0001_**initial**.py" — the file
  is `0001_audit.py`. Stale reference, fix the comment.
- ⚠️ `DATA-INTEGRITY-AND-STORAGE.md` §4/§5 still describe the removed **SQLite** path — update.

**Rule:** change a table → edit the Alembic migration (source of truth), then regenerate
`schema.sql` (`pg_dump --schema-only`) and update `models.py`. Keep all three in step.
