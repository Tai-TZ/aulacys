# Deploy — GCP + Supabase (database-per-service)

> Target: services run on **GCP Cloud Run** (serverless containers), databases live on
> **Supabase** (managed Postgres), one database per DB-owning service. Keeps the seam
> fallback so a dead service degrades, not crashes.

## 1. Topology

```
                 GCP Cloud Run (stateless containers)
  web ─────────────► api-gateway ──► orchestrator-svc ──► policy / cic / aml /
  (or Vercel)                                             property / income / catalog /
                                                          agent-worker   (no DB)
                                     orchestrator-svc ──► audit-svc  ──► Supabase (audit)
                                                      └─► los-svc    ──► Supabase (los)
  Secrets: GCP Secret Manager   ·   Images: Artifact Registry
```

- **Compute:** every service = one Cloud Run service (scales to zero, HTTPS URL each).
- **DB:** only **audit-svc, los-svc** (+ orchestrator `loan_run` later) touch Supabase.
  The other 7 services are stateless/seed → **no DB**.
- **Web:** Cloud Run or Vercel (Vercel is simpler for Next.js).

## 2. "Nhiều db Supabase" — two ways, pick by budget

A Supabase **project = one Postgres database**. To get multiple databases:

| Option | How | Isolation | Cost |
|--------|-----|-----------|------|
| **Project-per-service** | 1 Supabase project each for audit / los / orchestrator | strongest (true DB-per-service) | ⚠️ free tier ≈ **2 projects/org**; 3 = paid |
| **Schema-per-service** (recommended start) | 1 project, schemas `audit` / `los` / `orchestrator`, a DB role scoped per schema | logical, no shared tables | **fits free** (1 project) |

Both honour the rule: **no service reads another's tables, no cross-service FK.**
Start **schema-per-service** (1 project, free); move audit/los to their **own projects**
when you need independent scaling/backup. Env format is identical — only the URL changes.

## 3. Connection — the two Supabase URLs (per service)

Each DB-owning service gets **two** strings from its Supabase project/schema:

| Env | Port | Pooler | Use |
|-----|------|--------|-----|
| `DATABASE_URL` | **6543** | transaction | runtime queries (`pgbouncer=true`, `statement_cache_size=0`) |
| `DIRECT_URL` | **5432** | session | **migrations only** (Alembic needs a real session) |

```
DATABASE_URL=postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres
```
Schema-per-service: append `?options=-csearch_path%3Daudit` (or set the role's default
`search_path`) so each service only sees its schema.

## 4. Secrets — GCP Secret Manager (never in image/git)

```bash
echo -n "postgresql://…:6543/…" | gcloud secrets create audit-database-url --data-file=-
echo -n "postgresql://…:5432/…" | gcloud secrets create audit-direct-url   --data-file=-
```
Grant each Cloud Run service's runtime SA `secretAccessor`, then inject:
```bash
gcloud run deploy audit-svc --update-secrets \
  DATABASE_URL=audit-database-url:latest,DIRECT_URL=audit-direct-url:latest
```

## 5. Deploy steps

```bash
# 1. Build + push each image
gcloud builds submit services/audit-svc --tag <region>-docker.pkg.dev/<proj>/svc/audit-svc
# 2. Deploy each as a Cloud Run service (stateless services need no secrets)
gcloud run deploy policy-svc --image …/policy-svc --allow-unauthenticated
# 3. DB services get their Supabase secrets (step 4)
gcloud run deploy audit-svc --image …/audit-svc --update-secrets DATABASE_URL=…,DIRECT_URL=…
# 4. Wire the orchestrator to the Cloud Run URLs
gcloud run deploy orchestrator-svc --image …/api --set-env-vars \
  POLICY_SVC_URL=https://policy-svc-xxxx.run.app,AUDIT_SVC_URL=https://audit-svc-xxxx.run.app,…
```
- Service-to-service addressing = each callee's **Cloud Run HTTPS URL** in the caller's
  `*_SVC_URL` env. (No Eureka/discovery needed — Cloud Run gives stable URLs.)
- Auth: demo = `--allow-unauthenticated`; prod = Cloud Run **IAM** (caller SA has
  `run.invoker` on callee) + ID-token on requests.

## 6. Migrations on Supabase

Run **per service**, against its `DIRECT_URL` (:5432 session pooler):
```bash
# one-off, or as a Cloud Run Job before serving traffic
DATABASE_URL=$AUDIT_DIRECT_URL alembic upgrade head   # in services/audit-svc
```
Each service owns its Alembic; never migrate another service's schema.

## 7. Fallback still applies
If a service's env URL is unset or it's down, the orchestrator runs that piece
in-process — so a partial deploy still serves. For a true microservice run, set every
`*_SVC_URL` to the Cloud Run URLs.

## 8. Cost / scale notes
- Cloud Run scales to zero → pay per request; cold start ~1–2s (warm before a demo).
- Supabase free = 1 project (schema-per-service fits). Paid when you split audit/los into
  own projects or exceed limits.
- 7 stateless services need no DB → cheap. Only audit/los hit Supabase.

## 9. Summary
- **Compute:** GCP Cloud Run, one service each, wired by Cloud Run URLs.
- **DB:** Supabase — **schema-per-service in 1 project** (free, start) → **project-per-service**
  (paid, strict) later. Only audit/los/orchestrator.
- **Secrets:** GCP Secret Manager (`DATABASE_URL` + `DIRECT_URL` per DB service).
- **Migrations:** per-service Alembic against `DIRECT_URL`.
- **Demo VM alt:** one Compute Engine VM + `docker compose up` (postgres container) if you
  don't want Cloud Run yet — see `DEPLOY.md`.
