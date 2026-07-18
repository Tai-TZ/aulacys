<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
Copy this file to docs/handoffs/YYYY-MM-DD-<slug>.md and fill it in.
-->
# Handoff — Client launch UI port

- **Date:** 2026-07-18
- **Author:** Tai / Cursor agent
- **Branch / PR:** feat/admin_page (local) — not opened yet
- **Status:** ✅ Done

## What changed & why

Ported the visual experience from private repo `Tai-TZ/shb-loan-launch` into the existing Next.js `/client` route. Kept the locked stack (Next 14 + React 18 + Tailwind tokens) instead of swapping to Vite/TanStack Start. Floating `LoanChatbot` is unchanged and still calls `sendChat` with a network fallback.

## Files touched

- `apps/web/app/client/page.tsx` — full launch landing (hero, goals, help, pricing, steps, CTA, footer)
- `apps/web/components/client/client-nav.tsx` — sticky nav + mobile menu (client)
- `apps/web/components/client/loan-calculator.tsx` — amortization calculator with native range inputs (no Radix)
- `apps/web/app/globals.css` — added `brand-hover`, `navy-deep`, `cream`, `accent`, `gradient-hero`, `shadow-card`, `shadow-elevated`, native range styles
- `apps/web/public/shb/hero.png`, `help-1.png`, `help-2.png`, `help-3.png`, `steps.png` — assets copied from launch repo
- `apps/web/components/client/loan-chatbot.tsx` — **unchanged** (still mounted on `/client`)

## How to run / verify

```bash
cd apps/web
npm run lint
npm run build
npm run dev
# open http://localhost:3000/client
```

Expected:
- Landing matches launch look (Aulacys orange/navy, calculator card overlapping hero)
- Mobile menu toggles; calculator sliders update monthly payment / interest
- Floating chatbot opens, sends via API, shows fallback on failure
- `npm run lint` + `npm run build` green

## Contract impact

none — `schemas.py` and `apps/web/lib/api.ts` untouched. No new npm dependencies.

## Follow-ups / TODO

- [ ] Wire CTA / “Đăng ký ngay” / calculator into chatbot open or `assess` when product wants it
- [ ] Admin page still corporate-scoped — separate task
- [ ] Sync `feat/admin_page` with `origin/develop` before PR if still behind
- [ ] Optional: remove unused old assets (`loan-hero.jpg`, `loan-calculator.jpg`) if nothing else references them

## Route note (follow-up 2026-07-18)

- Landing now lives at `/` (not `/client`). `app/client/` removed.
- Font: **Be Vietnam Pro** via `next/font/google` (Vietnamese subset).
- Calculator range tracks fill with brand orange via `--range-progress`.
- Header labels scroll to landing sections (`#san-pham-vay`, `#vi-sao-chon`, `#bieu-phi`, `#quy-trinh`, `#dang-ky-ngay`).
- VN | EN toggle via `I18nProvider` + `lib/i18n/dictionaries.ts` (localStorage).
- Product detail: `/vay/mua-nha`, `/vay/mua-oto`, `/vay/du-hoc` (SHB-style layout, Aulacys tokens) + `loading.tsx`.
- Auth demo pages: `/dang-nhap`, `/dang-ky` (no backend).
- Goal cards CTA text: **Xem chi tiết** → product detail.

## Gotchas

- Source repo is **Vite + TanStack Start + React 19 + Radix**. Do **not** drop it into `apps/web`; port visuals only.
- Calculator uses native `<input type="range">` + `.loan-range` CSS — intentional to avoid `@radix-ui/react-slider` (new dep = team decision).
- Auth is demo-only success state — not wired to API.
- Chatbot still uses token classes like `bg-brand` / chat-* — those tokens remain in `globals.css`.
- Admin sidebar “Mở trang khách hàng” points to `/`.
