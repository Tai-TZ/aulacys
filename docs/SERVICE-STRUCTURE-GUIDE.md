# Service structure guide — what to code in each service

> The target layout for every service and what goes in each file. Current services are
> a single `app/main.py` (demo-thin). This is the production-shaped structure to grow
> into. Ground rules from `ARCHITECTURE-services.md` + `MICROSERVICES-PRODUCTION-REPORT.md`.
>
> **Per-service DB · API · coding steps:** [`SERVICE-CODING-PLAN.md`](./SERVICE-CODING-PLAN.md)
> (canonical roadmap). This file is the skeleton only.

## 0. Standard skeleton (all services)

```
services/<name>-svc/
  app/
    main.py            # WIRING ONLY: create FastAPI, mount router, middleware, startup
    core/
      config.py        # pydantic-settings: env vars, validated, typed
      logging.py       # structured logging setup (request_id)
      errors.py        # exception handlers -> typed JSON errors
    api/
      routes.py        # HTTP layer ONLY: parse request -> call service -> shape response
      deps.py          # FastAPI dependencies (get settings, get repo)
    schemas/
      <domain>.py      # pydantic request/response models
    services/
      <domain>.py      # BUSINESS LOGIC (pure, testable, no FastAPI here)
    repositories/      # ONLY if the service owns data
      <domain>.py      # data access (DB or seed loader)
    clients/           # ONLY if it calls other services
      <name>_client.py # outbound httpx with retry + timeout
  tests/
    test_<domain>.py   # unit + a smoke test of the route
  migrations/          # ONLY if it owns a SQL DB (Alembic)
  seed/ | rules/       # ONLY reference-data services
  Dockerfile
  pyproject.toml       # (or requirements.txt for now)
  README.md            # what it is, run, endpoints
```

**Layer rule:** `api/` never contains business logic; `services/` never imports FastAPI;
`repositories/` is the only place that touches storage. This is what makes each service
testable and swappable.

## 1. Which layers each service needs

| Service | api | schemas | services | repositories | clients | migrations | seed/rules |
| ------- | --- | ------- | -------- | ------------ | ------- | ---------- | ---------- |
| policy-svc | ✅ | ✅ | ✅ (engine) | — | — | — | `rules/` |
| audit-svc | ✅ | ✅ | ✅ (hash chain) | ✅ (DB) | — | ✅ | — |
| los-svc | ✅ | ✅ | ✅ | ✅ (DB) | — | ✅ | — |
| cic/aml/property-svc | ✅ | ✅ | ✅ (lookup) | ✅ (seed) | — | — | `seed/` |
| income-svc | ✅ | ✅ | ✅ (compute) | — | — | — | — |
| catalog-svc (new) | ✅ | ✅ | ✅ | ✅ (seed) | — | — | `seed/` |
| api-gateway | ✅ | ✅ | ✅ (aggregate) | — | ✅ (all) | — | — |
| agent-worker-svc | ✅ | ✅ | ✅ (agent) | — | ✅ (tools) | — | — |

---

## 2. Per-service — what to code

### policy-svc (:8100) — Policy Decision Point
**Owns:** rule YAMLs. **Calls:** nobody (pure).
```
app/services/engine.py     # load_rules() + evaluate(metrics, as_of) — the current policy.py
app/schemas/policy.py      # EvaluateRequest{metrics, as_of}, EvaluateResponse{violations, veto, rule_ids}
app/api/routes.py          # POST /evaluate, GET /rules/unverified, GET /health
rules/*.yaml               # versioned rules (verified + version fields)
tests/test_engine.py       # as_of gating, blocking sort, unverified surfacing
```
**Code focus:** keep it deterministic, no LLM, table-driven operators. Add per-product caps.

### audit-svc (:8200) — immutable ledger
**Owns:** `audit_record`, `audit_violation`. **Calls:** nobody.
```
app/repositories/ledger.py # append_record(), records_for(), verify_chain() — the current db.py
app/services/audit.py      # hash computation, chain linking, idempotency on (application_id, decided_at)
app/schemas/audit.py       # RecordRequest{+violations}, RecordResponse{record_id, seq, content_hash}
app/api/routes.py          # POST /records, GET /records/{app_id}, GET /verify, GET /health
migrations/                # Postgres (prod) with UPDATE/DELETE triggers
tests/test_chain.py        # append + tamper -> verify catches (already proven manually)
```
**Code focus:** append-only (no update/delete endpoints), hash chain, prod = Postgres triggers.

### los-svc (:8310) — loan ticket (system of record)
**Owns:** `loan_ticket`. **Calls:** nobody.
```
app/repositories/tickets.py # upsert_ticket(), tickets_for()
app/services/los.py         # ticket id rules, status transitions
app/schemas/ticket.py       # TicketRequest{application_id, status, summary, product}
app/api/routes.py           # POST /tickets, GET /tickets/{app_id}, GET /health
migrations/                 # loan_ticket (+ ticket_history in prod)
tests/test_tickets.py       # upsert keeps created_at, updates status
```

### cic-svc / aml-svc / property-svc (:8300/8320/8330) — external mocks
**Owns:** seed reference data. **Calls:** nobody.
```
app/repositories/seed.py    # load JSON seed once, lookup by key with clean default
app/services/<domain>.py    # cic: score lookup · aml: name->matches · property: parcel valuation
app/schemas/<domain>.py     # LookupRequest / ScreenRequest, response with `source` + `computed_at`
app/api/routes.py           # POST /lookup | /screen | /valuation, GET /health
seed/*.json                 # realistic seed aligned to products (see SERVICE-CODING-PLAN)
tests/test_lookup.py        # known key -> record, unknown -> default
```
**Code focus:** deterministic, unknown input returns a safe default (demo never breaks).

### income-svc (:8340) — stateless compute
**Owns:** nothing. **Calls:** nobody.
```
app/services/income.py      # income_verify(), sao_ke_parse() — pure functions
app/schemas/income.py       # VerifyRequest{declared, statement}
app/api/routes.py           # POST /verify, POST /parse, GET /health
tests/test_income.py        # verified income logic, negative-input errors
```
**No repositories** — it computes, stores nothing.

### catalog-svc (:8350, NEW) — product catalog
**Owns:** SHB product catalog seed. **Calls:** nobody.
```
app/repositories/catalog.py # load catalog.json, filter in-scope (retail) products
app/services/catalog.py     # derive config_hint (agents, gate, LTV/term caps) per product
app/schemas/catalog.py       # Category, Product, ProductDetail
app/api/routes.py           # GET /categories, GET /products, GET /products/{id}, GET /health
seed/catalog.json           # from docs/data/message.txt (cleaned)
tests/test_catalog.py       # scope filter, config_hint derivation
```

### api-gateway (:8080) — front door + monitor
**Owns:** nothing. **Calls:** all services (health) + monolith (assess).
```
app/clients/service_client.py # httpx GET /health, POST proxy, with timeout
app/services/monitor.py       # aggregate /status: up/down/latency per service
app/services/proxy.py         # forward /assess to monolith with fallback
app/schemas/status.py         # ServiceStatusItem, StatusResponse
app/api/routes.py             # GET /status, POST /assess, GET /catalog (proxy), GET /health
tests/test_monitor.py         # degraded when a service is down
```
**Code focus:** never crash if a downstream is down — return degraded status.

### agent-worker-svc (:8400) — ONE service, all four agents
**Owns:** nothing (per-request). **Calls:** tools/policy over HTTP.
> Decision: credit/operations/compliance/critic are **one** service (dispatch by
> `req.agent`), not four — see `SERVICE-CODING-PLAN.md` §12. Currently 4 processes
> (8401–8404 via `AGENT_NAME`); target is one instance on 8400.
```
app/services/worker.py        # run(spec_name, state_slice) -> typed verdict (credit/operations/compliance/critic)
app/clients/                  # tool + policy clients (httpx)
app/schemas/worker.py         # RunRequest{node, state_slice}, verdict responses
app/api/routes.py             # POST /run, GET /health
tests/test_worker.py          # each worker produces its schema; invalid -> error not crash
```
**Code focus:** stateless request/response; orchestrator falls back in-process if this is down.

---

## 3. Migration path (thin → structured), per service

For each service, one refactor PR:
1. Split `main.py` → `api/routes.py` (HTTP) + `services/*` (logic) + `repositories/*` (data).
2. Add `core/config.py` (pydantic-settings) — replace inline `os.getenv`.
3. Add `tests/` (at least: one logic test + one route smoke test).
4. Add `README.md` (run + endpoints).
5. Data-owners: add `migrations/` (Alembic) and move SQLite → Postgres.

Do the **stateful services first** (audit, los) — they carry the most risk — then reference
services, then stateless, then gateway/worker.

## 4. Definition of done — per service

- [ ] Layered: `api` has no logic, `services` has no FastAPI, `repositories` owns all storage.
- [ ] `core/config.py` validates env; no bare `os.getenv` in logic.
- [ ] `GET /health` (liveness) + readiness check if it has dependencies.
- [ ] Tests: unit (logic) + route smoke; green in CI.
- [ ] `README.md`: purpose, run, endpoints, env vars.
- [ ] Owns data → own Alembic migrations, no shared DB, no cross-service FK.
- [ ] Calls others → `clients/` with timeout + fallback; never 500 on a downstream failure.
