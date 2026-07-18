# Microservices — maturity report & path to production

> Honest assessment of the current split and what it takes to become a
> production-grade, deployable system. Companion to `ARCHITECTURE-services.md`
> (design) and `MICROSERVICES-STATUS.md` (run/status).

## 1. Executive summary

The split is **functionally real** (services talk over HTTP, own their data, degrade to
in-process fallback) but **demo-grade in engineering maturity**. Each service is a thin
single-file FastAPI app. That is the **right choice for the hackathon** — it proves the
architecture without burning hours on infrastructure. It is **not yet production-grade**:
no layering, real databases for only some, no observability stack, no CI, no auth, no
resilience patterns. This report lists the gaps and a phased plan to close them **after**
the demo.

## 2. "Are the services too simple? Why only a main.py?"

**Yes — deliberately.** Today each service packs routes + request models + business logic
+ startup into one `app/main.py` (a few have `db.py`/`policy.py`/`seed`). Current shape:

| Service | Files | Has |
| ------- | ----- | --- |
| policy-svc | 7 | main + `policy.py` engine + 2 rule YAMLs |
| audit-svc | 5 | main + `db.py` (SQLite ledger) |
| los-svc | 5 | main + `db.py` (SQLite tickets) |
| cic/aml/property | 5 | main + JSON seed |
| income / api-gateway / agent-worker | 4 | main only |

For a service this small a single file is fine. **Production** wants a standard layout:

```
service/
  app/
    api/         routers (HTTP layer only)
    schemas/     pydantic request/response
    services/    business logic
    repositories/ data access (DB/seed)
    core/        config, logging, errors, deps
    main.py      wiring only
  tests/
  migrations/    (if it owns a DB)
  Dockerfile  pyproject.toml  README.md
```

So "only a main.py" is not a bug — it is demo-thin. The report below is the upgrade path.

## 3. How the services relate to `apps/api`

This is the most-asked question. Two rules:

1. **Dependency direction is one-way.** `apps/api` (the monolith) **calls** the services;
   services **never** import or depend on `apps/api`. Each service is self-contained
   (its own copy of any logic it needs — e.g. `services/policy-svc/app/policy.py` mirrors
   `apps/api/src/policy/loader.py`). That duplication is what makes a service independently
   deployable.
2. **Every call is optional, with a fallback.** The monolith has a seam per service
   (`policy/client.py`, `agents/audit_client.py`, `tools/{cic,aml,property,income,workflow}.py`).
   If the service's env URL is set → HTTP call; else or on error → the monolith's own
   in-process copy. So the monolith is **primary**; services are **extracted, optional
   offloads**. Nothing in `apps/api` breaks if every service is down.

```
apps/api (monolith, primary)                services/ (independent, optional)
  policy/client.py      ──POLICY_SVC_URL──▶  policy-svc   (own rules)
  agents/audit_client   ──AUDIT_SVC_URL───▶  audit-svc    (own SQLite ledger)
  tools/cic.py          ──CIC_SVC_URL─────▶  cic-svc      (own seed)
  tools/workflow.py     ──LOS_SVC_URL─────▶  los-svc      (own SQLite tickets)
  ...                                        aml/property/income-svc
  (api-gateway fronts the monolith + /status monitor)
```

## 4. Production-readiness gap analysis

| Dimension | Now (demo) | Production needs |
| --------- | ---------- | ---------------- |
| **Code structure** | one `main.py` per service | layered: api / schemas / services / repositories / core |
| **Config** | `os.getenv` inline | `pydantic-settings` per service, 12-factor, validated |
| **Database** | SQLite (audit, los) · JSON seed · none | **Postgres per data-owner**, connection pooling, migrations (Alembic) per service |
| **Data immutability** | app-level append-only + hash chain (SQLite) | Postgres triggers (migration `0001` in monolith) + WORM storage/retention |
| **Inter-service calls** | `urllib`, 5s timeout, bare `except` | `httpx` client, **retries + circuit breaker** (tenacity/pybreaker), timeouts per route, connection pool |
| **Contracts** | hand-written pydantic on both sides | shared **OpenAPI**/proto, generated clients, versioned (`/v1`), contract tests |
| **Async / events** | synchronous HTTP for everything | **message bus** (NATS/Kafka) for `DecisionRecorded` → audit (fire-and-forget), outbox pattern |
| **Observability** | homegrown `trace.py` in monolith; gateway `/status` | **OpenTelemetry** traces (request_id across services) → Jaeger; Prometheus metrics + Grafana; structured logs → Loki |
| **Health** | `/health` liveness only | split **liveness vs readiness**; dependency checks; graceful shutdown |
| **Security** | none (open endpoints) | service-to-service **auth** (mTLS via mesh / JWT), API gateway authn/z, rate limiting, input hardening |
| **Secrets** | env vars | Vault / sealed secrets / cloud secret manager |
| **Testing** | monolith has 50 tests; **services have ~none** | unit + contract + integration tests **per service**; smoke suite in CI |
| **CI/CD** | none | build+test+scan per service, image registry, deploy pipeline |
| **Runtime** | `uvicorn` bare, single worker | gunicorn/uvicorn workers, resource limits, autoscaling |
| **Orchestration** | `docker-compose` (dev) | **Kubernetes** (Deployments, HPA, probes) + **service mesh** (Linkerd/Istio) for discovery/mTLS/retry |
| **Resilience** | fallback per seam (good!) | + bulkheads, timeouts, retries, dead-letter, idempotency keys |

**What's already good** (keep): clean seams, per-service data ownership, graceful
fallback, gateway status monitor, deterministic policy with `version` + `verified`,
append-only + hash-chained audit.

## 5. Target production architecture

- **Ingress:** API gateway (Kong/Traefik or the FastAPI gateway) — authn, rate-limit, routing.
- **Services:** each in the layered layout (§2), own Postgres (data-owners), own Alembic.
- **Sync path:** orchestrator → workers/tools over `httpx` with circuit breakers.
- **Async path:** `DecisionRecorded`/`VetoFired` on a bus → audit-svc + dashboard consumers (outbox pattern for exactly-once).
- **Cross-cutting (infra, not app code):** OpenTelemetry + Jaeger (trace), Prometheus + Grafana (metrics), Loki (logs), Vault (secrets), Kubernetes + Linkerd (discovery, mTLS, retries).
- **CI/CD:** per-service pipeline → registry → GitOps (Argo/Flux) → K8s.

## 6. Future plan (phased, post-hackathon)

| Phase | Goal | Effort |
| ----- | ---- | ------ |
| **P-A** | **Standardize service skeleton** — one cookiecutter (api/schemas/services/repositories/core + tests + pyproject). Refactor the 9 services into it. | M |
| **P-B** | **Real datastores** — Postgres per data-owner (audit, los, orchestrator, policy), Alembic per service, immutability triggers for audit. | M |
| **P-C** | **Contracts + clients** — publish OpenAPI per service, generate typed clients, add `/v1`, contract tests. | M |
| **P-D** | **Resilience** — `httpx` + tenacity + pybreaker on every seam; readiness probes; graceful shutdown. | S |
| **P-E** | **Observability** — OpenTelemetry (propagate `request_id`), Prometheus metrics, Grafana + Jaeger + Loki. | M |
| **P-F** | **Async events** — NATS/Kafka + outbox; move audit write off the sync path. | M |
| **P-G** | **Security** — gateway authn/z, service mesh mTLS, rate limits, Vault secrets. | M |
| **P-H** | **CI/CD + K8s** — per-service pipeline, Helm/Kustomize, HPA, GitOps deploy. | L |
| **P-I** | **Finish the split** — agent workers as services (`agent-worker-svc` started), orchestrator fully HTTP (Phases 5–6 of the demo plan). | L |

Ordering rationale: skeleton (A) and datastores (B) first so everything else lands on a
stable base; resilience (D) and observability (E) before security (G); K8s (H) once
services are individually production-shaped; the agent split (I) last (highest risk).

## 7. Recommendation for the hackathon vs after

- **During the hackathon:** do **not** chase production hardening. It burns the hours the
  demo needs and risks the veto loop (`AGENTS.md`:43). Current demo-grade services already
  make the point: *"real services, own data, HTTP calls, graceful fallback, boundaries that
  mirror the bank's real systems."* Ship this report as proof the team knows the road to
  production.
- **After the hackathon:** execute P-A → P-I. Each phase is independently shippable and
  leaves the system runnable throughout.

> One-line pitch: *"What you see is a demo-grade slice of a production design. The seams,
> data ownership, and fallback are already right; going to production is adding
> infrastructure — Postgres, a mesh, OTel, CI — not rewriting the logic."*
