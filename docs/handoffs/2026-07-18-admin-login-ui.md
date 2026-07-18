# Handoff — Admin login UI (mock session)

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** feat/admin_page
- **Status:** ✅ Done

## What changed & why

Admin console had no gate — anyone hitting `/admin` saw the monitor. Added a
**demo login** at `/admin/login` (localStorage session, no auth backend) so the
demo opens with a proper staff login before the assess dashboard.

## Files touched

- `apps/web/app/admin/login/page.tsx` — route
- `apps/web/components/admin/admin-login-page.tsx` — split-panel login UI
- `apps/web/lib/admin-session.ts` — read/write/verify session + demo credentials
- `apps/web/components/admin/admin-shell.tsx` — redirect if no session; logout + avatar

## How to run / verify

```bash
cd apps/web && npm run build
# open http://localhost:3000/admin → redirects to /admin/login
# email: admin@aulacys.demo  password: admin123 → /admin
# sidebar Đăng xuất → back to login
```

## Contract impact

none (frontend-only mock auth)

## Follow-ups / TODO

- [ ] Real auth / RBAC later if needed (out of slice — AGENTS.md says demo MCP role only)
- [ ] Optional second demo user `approver@…` with role-scoped nav

## Gotchas

- Session key: `aulacys-admin-session` (separate from customer `aulacys-demo-session`)
- Client-side gate only — not secure; fine for hackathon demo
- Home `/` still redirects to `/admin` which then sends unauthenticated users to login
