# Handoff — Admin UI: real vs shell (pre-build status)

- **Date:** 2026-07-18
- **Author:** Cursor agent
- **Branch / PR:** `docs/admin-ui-status` → `develop`
- **Status:** ✅ Done (status note only — no product code in this handoff)

## What changed & why

Document what `/admin` actually does today after P0/P1 merged, so the next build does not mistake chrome for product. Sidebar labels look like a full ops console; most are dead links. Only the live assess panel is wired.

## Files touched

- `docs/handoffs/2026-07-18-admin-ui-real-vs-shell.md` — this note

## How to run / verify

```bash
# API :8000 + web :3000
# Open http://localhost:3000/admin
# Click "Chạy thẩm định" on preloaded mortgage → veto + timeline
```

Expect: assess path works if API is up. Sidebar items do not navigate to separate pages.

## Contract impact

none

## Current truth table

| UI label | Works? | Reality |
|----------|--------|---------|
| **Tổng quan** / assess form | **Yes** | `AssessDashboard` → `POST /api/v1/assess/application` (+ Seed `/assess`) |
| **Chạy thẩm định** | **Yes** (if API `:8000`) | Live graph; needs `NEXT_PUBLIC_API_URL` |
| **Seed /assess** | **Yes** | Message seed path |
| **Hồ sơ tín dụng** | **No** | `Link href="/admin"` — same page, no case list API |
| **Quản lý agent** | **No** | Same stub link |
| **Người phê duyệt** | **No** | Same stub; HITL approve not built |
| **Cấu hình** | **No** | Same stub |
| **Tìm kiếm hồ sơ** | **No** | Decorative `Input` |
| **Đăng xuất** | **No** | Button with no handler |
| Client **Service monitor** | **Partial** | Needs gateway `:8080`; without it shows degraded |

## Follow-ups / TODO (needs team pick — AGENTS.md §1)

Do **not** build all of these without a slice decision. Demo-critical first:

- [ ] Fix/polish **Chạy thẩm định** only if broken (API URL, errors, unverified badge)
- [ ] Optional: mark sidebar stubs as "Sắp có" so judges are not misled
- [ ] New pages (hồ sơ / agents / approvers / config) = **new feature** → ask team first
- [ ] HITL approve + real ticket write = wow-flow tail, still thin

## Gotchas

- Clicking sidebar items feels broken because every link is `/admin` — intentional shell from the landing mock, not a regression from P0.
- If assess fails: check only one `next dev` on `:3000`, API on `:8000`, hard refresh after CSS cache issues.
- Process for next build (per human request): write handoff → commit → push → then implement.
