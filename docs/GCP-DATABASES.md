# GCP Databases — Microservice Runtime

This repo is moving toward a full-microservice runtime. The rule is simple:
services own their own persistence; other services call them over HTTP and do not
read their tables directly.

## DB-owning services

For local demo we use one Postgres container with one schema per service. For GCP
production, prefer one Cloud SQL Postgres database per DB-owning service. If cost
or hackathon setup time matters, one Cloud SQL instance can host all databases.

| Service | Owns | Local schema | Suggested Cloud SQL DB | Runtime secret | Migration secret |
|---|---|---|---|---|---|
| `orchestrator-svc` | workflow runs, node attempts, replan events | `orchestrator` | `shb_orchestrator` | `ORCHESTRATOR_DATABASE_URL` | `ORCHESTRATOR_DIRECT_URL` |
| `application-svc` | submitted loan application / Section A data | `application` | `shb_application` | `APPLICATION_DATABASE_URL` | `APPLICATION_DIRECT_URL` |
| `los-svc` | approval tickets + ticket history | `los` | `shb_los` | `LOS_DATABASE_URL` | `LOS_DIRECT_URL` |
| `audit-svc` | append-only audit ledger + violations | `audit` | `shb_audit` | `AUDIT_DATABASE_URL` | `AUDIT_DIRECT_URL` |

## Control plane and knowledge plane stores

These are not in the core local bootstrap yet because their runtime services are
not wired. They are required for the full architecture before production:

| Service | Owns | Recommended GCP store | Notes |
|---|---|---|---|
| `identity-svc` / `authz-svc` | users, roles, permissions, approval delegation | Cloud SQL Postgres | App RBAC; separate from Cloud IAM |
| Cloud Run service identity | service-to-service invocation rights | Cloud IAM | Runtime caller auth for private Cloud Run services |
| `knowledge-svc` vector store | embeddings + chunk metadata | AlloyDB AI vector search, or Postgres + pgvector for cheaper demo | Retrieval only; no hard thresholds |
| `knowledge-svc` graph store | regulation/product/process relationship graph | Spanner Graph | Graph RAG / lineage / relationship traversal |
| `knowledge-svc` object store | source PDFs and manuals | Cloud Storage | Store immutable source artifacts |

## Stateless / seed-backed services

These stay database-free for the hackathon slice unless a real integration is
added:

- `credit-agent-svc`
- `operations-agent-svc`
- `compliance-agent-svc`
- `critic-agent-svc`
- `cic-svc`
- `income-svc`
- `property-svc`
- `policy-svc` (YAML rules for now; future policy registry can add a DB)
- `aml-svc`
- `legal-svc`
- `catalog-svc` (seed JSON for now; future product admin can add a DB)

Planned DB-backed services:

- `identity-svc` / `authz-svc`
- `knowledge-svc`

## Local bootstrap

```bash
python services/db/bootstrap.py
python services/db/bootstrap.py --verify
```

This creates schemas and runs Alembic for:

- `services/orchestrator-svc`
- `services/application-svc`
- `services/los-svc`
- `services/audit-svc`

## GCP deployment notes

1. Create a Cloud SQL Postgres instance.
2. Create the four service databases above, or use one database with four schemas for a cheaper demo.
3. Create separate runtime and migration users per service.
4. Store runtime `DATABASE_URL` and migration `DIRECT_URL` in Secret Manager.
5. Grant each runtime user only its own schema/database.
6. Run Alembic from CI/CD with the migration secret before deploying Cloud Run revisions.

The orchestrator database is not an audit ledger. It is mutable workflow state.
The immutable evidence trail remains in `audit-svc`.

See also `docs/CONTROL-AND-KNOWLEDGE-PLANE.md`.
