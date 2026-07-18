# Handoff — Dossier Preview & Read-Only Banker Workspace

- **Date:** 2026-07-18
- **Author:** Antigravity (Gemini 3.5 Flash)
- **Branch / PR:** develop
- **Status:** ✅ Done

## What changed & why
Converted the banker retail loan application dashboard from an editable input form to a read-only viewer. Built a realistic dossier layout component (`DossierPreviewCard`) that mimics the actual printed SHBFinance paper loan application form. Added a clean Control Board card at the top allowing the banker to select kịch bản demo (Bé Hoa, Trần Vui, Huyền Trần), check simulation flags (Tier-3 confirmation), and execute the graph assessment.

## Files touched
- `apps/web/components/admin/assess-dashboard.tsx` — Replaced the large editable input form card with the new read-only `DossierPreviewCard` and top-level simulation Control Board. Escape all double quotes to comply with JSX eslint requirements.
- `apps/api/src/agents/state.py` — Merged changes from `git pull` develop.
- `apps/web/lib/api.ts` — Merged changes from `git pull` develop.

## How to run / verify
1. Run development servers (API on `:8000`, Web on `:3000`).
2. Go to `http://localhost:3000/admin`.
3. Select any customer scenario (e.g. ✅ Happy — Bé Hoa). The screen displays the full read-only paper loan application layout pre-filled.
4. Click "Chạy Thẩm Định (API)" or "Seed tự động". Verify that the graph execution begins and populates the Node timeline trace on the right side.

## Contract impact
none.

## Follow-ups / TODO
- [ ] Connect the output of the compliance veto/HITL replanning to the approval workflow page when required.

## Gotchas
- The dossier preview card renders checkboxes dynamically based on the customer occupation and position keywords.
