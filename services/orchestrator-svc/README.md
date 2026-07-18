# orchestrator-svc

Owns the workflow/run database for the full-microservice runtime.

This service is intentionally thin: business decisions stay in specialist agent
services. The orchestrator owns DAG execution state, replan attempts, node run
metadata, and workflow events so a request can be reconstructed without reading
agent/tool databases directly.

## Database

Schema: `orchestrator`

Tables:

- `orchestrator_run` — one workflow execution per loan assessment.
- `orchestrator_node_run` — each agent/node attempt within the workflow.
- `orchestrator_event` — append-style workflow events for replay/debug.

## Local migrate

```bash
cd services/orchestrator-svc
alembic upgrade head
```

## GCP

Use Cloud SQL Postgres. Prefer one database per DB-owning service in production:

- DB: `shb_orchestrator`
- schema: `orchestrator`
- runtime user: `orchestrator_app`
- migration user: `orchestrator_migrator`

Store `DATABASE_URL` and `DIRECT_URL` in Secret Manager.
