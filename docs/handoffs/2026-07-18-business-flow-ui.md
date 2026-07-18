<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
-->
# Handoff — Align admin dossier UI to 5-stage business flow

- **Date:** 2026-07-18
- **Author:** agent (Cursor)
- **Branch / PR:** `feat/admin_page` — not opened yet
- **Status:** ✅ Done (UI slice); backend RM-proposal agent still thin

## What changed & why

Aligned the admin Bộ hồ sơ detail UI with [`docs/FLOW-BUSINESS-CONFIRMED.md`](../FLOW-BUSINESS-CONFIRMED.md): stepper is now Tiếp nhận → **RM đề xuất** → Thẩm định → Phê duyệt → Giải ngân (removed "Phân loại"). Hid technical tokens (`retail_unsecured_salary`, `cccd`, `sao_ke_luong`) behind `productLabelVi` / `docKindLabelVi`. STP happy path shows Agent duyệt + auto giải ngân; HITL only when `ready_for_human_approval`. Added editable RM proposal fields (amount / term / rate / existing debt) before running the multi-agent graph.

## Files touched

- `apps/web/lib/labels.ts` — 5 `SopStage`s + `productLabelVi` + clearer node/doc labels
- `apps/web/components/admin/stage-tracker.tsx` — 5-stage map from `AssessResponse`
- `apps/web/components/admin/assess-dashboard.tsx` — wizard, RM edit card, STP/HITL banners, NodeTimeline

## How to run / verify

```bash
cd apps/web && npm run build   # green
# API :8000 + web :3000
# /admin/login → Bộ hồ sơ → NGUYỄN THỊ BÉ HOA
# Stepper: no raw product slug; docs show "CCCD / CMND", "Sao kê lương"
# Edit RM fields → Chạy thẩm định → StageTracker + multi-agent timeline
# Happy: STP banner + steps 4–5 complete; Veto: step 3 failed; Mortgage HITL: step 4 active
```

## Contract impact

none (frontend-only labels + UX)

## Follow-ups / TODO

- [ ] Dedicated backend RM-proposal node (`price_loan` from CIC group → editable rate) before appraisal graph
- [ ] DTI numerator should include CIC outstanding debt (FLOW-BUSINESS-REVIEW §4)
- [ ] Split "Chạy thẩm định" into explicit stage actions (RM agent run → then appraisal) if demo needs stepwise pause

## Gotchas

- Product/doc **ids** in seed/API stay English slugs; only **display** is Vietnamese via `labels.ts`.
- Unsecured STP auto-disburse is UI status mapping from `outcome === "stp_approved"` — no separate disbursement API call yet.
- `StageTracker` / stepper both encode the 5 stages; keep them in sync with FLOW-BUSINESS-CONFIRMED.
- Step 1 only checks after **Tiếp nhận**; `AgentRunProgress` animates while `/assess` runs (API is one-shot).
