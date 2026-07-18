# Deploy Guide

Two services, deployed separately, wired by two env vars + CORS:

```
Browser ── https://<web>.vercel.app ──▶  Web (Next.js, Vercel)
                                            │  fetch NEXT_PUBLIC_API_URL
                                            ▼
                         https://<api>.onrender.com  ──▶ API (FastAPI, Render)
```

| Piece                  | Host                      | Why                                                   |
| ---------------------- | ------------------------- | ----------------------------------------------------- |
| `apps/api` (FastAPI) | **Render** (Docker) | `render.yaml` blueprint; free tier                  |
| `apps/web` (Next.js) | **Vercel**          | native Next build; injects`NEXT_PUBLIC_*` correctly |

The two wires that MUST match, or nothing works:

1. Web's **`NEXT_PUBLIC_API_URL`** = the API's public URL.
2. API's **`CORS_ORIGINS`** = the Web's public URL. (Browser blocks cross-origin calls otherwise.)

---

## 0. Prerequisites

- Repo pushed to GitHub.
- An `OPENAI_API_KEY`.
- Accounts: [render.com](https://render.com), [vercel.com](https://vercel.com) (both free, GitHub login).

## 1. Deploy the API → Render

1. Render Dashboard → **New → Blueprint** → select this repo. It reads `render.yaml`.
2. Click **Apply**. Render builds `apps/api/Dockerfile`.
3. Open the `app-api` service → **Environment** → set:
   - `OPENAI_API_KEY` = your key
   - `CORS_ORIGINS` = `*` **for now** (tighten in step 3)
4. Wait for deploy → note the URL, e.g. `https://app-api.onrender.com`.
5. **Verify:** open `https://app-api.onrender.com/health` → `{"status":"ok",...}`.

> ⚠️ Free tier **sleeps after ~15 min idle** → first request cold-starts ~50s.
> Before a live demo: hit `/health` once to wake it, or keep a tab pinging it.
> Always have a **recorded backup video** (see `presentation/`).

## 2. Deploy the Web → Vercel

1. Vercel → **Add New → Project** → import this repo.
2. **Root Directory** → set to **`apps/web`** (important — it's a monorepo).
3. Framework preset auto-detects **Next.js**. Leave build/output defaults.
4. **Environment Variables** → add:
   - `NEXT_PUBLIC_API_URL` = your Render API URL (step 1.4), no trailing slash.
5. **Deploy** → note the URL, e.g. `https://your-app.vercel.app`.

## 3. Wire CORS (tighten)

1. Back in Render → `app-api` → **Environment**:
   - `CORS_ORIGINS` = your exact Vercel URL, e.g. `https://your-app.vercel.app`
     (comma-separate if several, no trailing slash).
2. **Manual Deploy → Deploy latest** (env change needs a restart).

## 4. Verify end-to-end

- Open the Vercel URL, send a chat message → a response comes back.
- Browser DevTools → Network: the `POST /api/v1/chat` is `200` (not a CORS error).

## 5. Auto-deploy

Both hosts redeploy on push to `main` (Render `autoDeploy: true`; Vercel by default).
Keep `main` green and deployable (see `AGENTS.md` §1).

---

## Alternatives

- **Whole stack on Render:** add a second `type: web`, `runtime: docker`, `rootDir: apps/web`
  service. Caveat: `NEXT_PUBLIC_API_URL` is baked at **build** time, so it must be passed as a
  Docker **build arg** (`apps/web/Dockerfile` already declares `ARG NEXT_PUBLIC_API_URL`).
  Vercel avoids this hassle — prefer it for the web.
- **Local full stack (DEFAULT = microservice):** `docker compose up --build` boots the
  **whole distributed system** — orchestrator `:8000` (wired to every service), web `:3000`,
  gateway `:8080`, and all services (`policy/audit/los/cic/aml/property/income/catalog` +
  4 agent workers). The orchestrator calls services over HTTP by default; the in-process
  fallback stays only as resilience. For a services-only run use
  `docker compose -f docker-compose.services.yml up`.

## Troubleshooting

| Symptom                               | Cause / Fix                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| Chat fails, DevTools shows CORS error | `CORS_ORIGINS` on the API ≠ the web origin. Fix + redeploy API.                        |
| Chat fails, 404/connection refused    | `NEXT_PUBLIC_API_URL` wrong or has trailing slash. Fix in Vercel + redeploy.            |
| First request very slow               | Render free cold start. Warm it before demo.                                              |
| API 500 on chat                       | Missing/invalid`OPENAI_API_KEY`. Check Render logs.                                     |
| Web env change ignored                | `NEXT_PUBLIC_*` is build-time — you must **redeploy** the web after changing it. |
