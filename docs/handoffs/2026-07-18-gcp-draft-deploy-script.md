# Handoff - GCP draft deploy script

- **Date:** 2026-07-18
- **Author:** Codex
- **Branch / PR:** WIP
- **Status:** Done

## What changed & why
Added PowerShell and WSL/Bash deploy scripts for the draft GCP Cloud Run runtime. The scripts can prompt for missing Secret Manager values directly in the terminal or sync them from an ignored `.env.production` file, optionally attach a Cloud SQL instance to Cloud Run services, then builds service images into Artifact Registry, deploys leaf services, DB-owned services, agent workers, the new orchestrator service, gateway, and web, then rewires CORS after the web URL is known. Also added the missing orchestrator Dockerfile and taught the web Dockerfile to bake every `NEXT_PUBLIC_*` URL it actually uses.

## Files touched
- `scripts/deploy-gcp-draft.ps1` - end-to-end Cloud Run draft deploy with preflight, dry-run, build, deploy, CORS update, and health verification.
- `scripts/deploy-gcp-draft.sh` - WSL/Bash equivalent of the draft deploy script.
- `.gitignore` - ignores `.env.production` and `env.production` so local secret input files are never committed.
- `services/orchestrator-svc/Dockerfile` - packages `services/orchestrator-svc` with `packages/shared/aulacys` so the new orchestrator can run independently of dangling `apps/api`.
- `apps/web/Dockerfile` - adds build args/env for `NEXT_PUBLIC_GATEWAY_URL` and `NEXT_PUBLIC_APPLICATION_SVC_URL`.

## How to run / verify
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-gcp-draft.ps1 -ProjectId demo-project -DryRun -SkipSecretCheck
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-gcp-draft.ps1 -ProjectId aulacys -PromptSecrets -SecretsOnly
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-gcp-draft.ps1 -ProjectId aulacys -EnvFile .env.production -SecretsOnly
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-gcp-draft.ps1 -ProjectId aulacys -Region asia-east1 -CloudSqlInstance aulacys:asia-east1:aulacys
bash scripts/deploy-gcp-draft.sh --project-id demo-project --dry-run --skip-secret-check --skip-build --secrets-only
bash scripts/deploy-gcp-draft.sh --project-id aulacys --region asia-southeast1 --env-file .env.production --secrets-only
python -m ruff check services\orchestrator-svc packages\shared
cd services\orchestrator-svc
python -m pytest -q
cd ..\..\packages\shared
python -m pytest -q
cd ..\..\apps\web
npm run lint
npm run build
```

Expected results from this change: deploy script dry-run prints the full GCP command sequence and draft URLs; Ruff passes; orchestrator tests report `21 passed`; shared tests report `82 passed`; frontend lint/build pass with existing `<img>` warnings in `components/admin/assess-dashboard.tsx`.

## Contract impact
None. No schema changes. `packages/shared/aulacys/models/schemas.py` and `apps/web/lib/api.ts` were not changed.

## Follow-ups / TODO
- [ ] Run the script against the real GCP project after creating the required Secret Manager secrets.
- [ ] Decide whether to keep draft services unauthenticated or add Cloud Run IAM/service-to-service auth after the demo URL is green.
- [ ] Repoint `docker-compose.yml`, `docker-compose.services.yml`, and legacy deploy docs from dangling `apps/api` to `services/orchestrator-svc`.
- [ ] Add an optional migrate/seed step for Supabase schemas if the team wants deploy to bootstrap DBs too.

## Gotchas
The script requires these secrets: `gemini-api-key`, `orchestrator-database-url`, `orchestrator-direct-url`, `application-database-url`, `application-direct-url`, `audit-database-url`, `audit-direct-url`, `los-database-url`, and `los-direct-url`. Run with `-PromptSecrets -SecretsOnly` to create or update them from terminal input, or `-EnvFile .env.production -SecretsOnly` to sync from a local ignored file before the real deploy. Secret writes use `gcloud.cmd` when available because the Cloud SDK PowerShell wrapper can emit successful writes as `NativeCommandError` under `$ErrorActionPreference = Stop`. It deploys public Cloud Run services by default for draft speed; use `-PrivateServices` only after wiring Cloud Run invoker auth. Docker local verification was not run because Docker Desktop's Linux engine was not available in this environment, but Cloud Build will build from the same Dockerfiles.
