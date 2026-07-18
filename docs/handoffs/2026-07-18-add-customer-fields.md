<!--
Handoff = the note the NEXT person/agent reads before touching this area.
Required after every finished feature/fix (AGENTS.md §2). Keep it short + honest.
Copy this file to docs/handoffs/YYYY-MM-DD-<slug>.md and fill it in.
-->
# Handoff — Add Missing Customer Info Fields

- **Date:** 2026-07-18
- **Author:** Antigravity AI
- **Branch / PR:** develop
- **Status:** ✅ Done

## What changed & why
Added all customer-related fields that exist in Page 1 of the SHBFinance loan request form PDF but were previously missing or unrendered in the Admin detailed dossier preview card (`DossierPreviewCard`). We kept the form focused on the Loan Request and deliberately excluded the Loan Contract clauses (pages 3-5 of the PDF) as requested.

## Files touched
- [state.py](file:///d:/aulacys/apps/api/src/agents/state.py) — Modified `DeclaredForm` schema to support: `old_national_id`, `phone_2`, `spouse_workplace_phone`, `consent_data_processing`, and `consent_advertising`.
- [graph.py](file:///d:/aulacys/apps/api/src/agents/graph.py) — Populated the new fields for the backend mock seed applications (`_UNSECURED_HAPPY`, `_UNSECURED_VETO`, `_UNSECURED_HITL`, and `MORTGAGE_DEMO`).
- [api.ts](file:///d:/aulacys/apps/web/lib/api.ts) — Synced TypeScript interface `DeclaredForm` with the added schema fields.
- [assess-dashboard.tsx](file:///d:/aulacys/apps/web/components/admin/assess-dashboard.tsx) — Added address segment parsing utility `parseAddress`, updated frontend mocks, relocated reference sections, added Spouse details, Financial Capacity, Consent checks, commitments, and staff verification sections in `DossierPreviewCard`.

## How to run / verify
```bash
# Verify backend builds and passes tests:
.venv\Scripts\pytest tests/ -v

# Verify frontend compile / TypeScript compilation:
cd apps/web && npm run build
```
Verify manually on `http://localhost:3000/admin/bo-ho-so` by viewing the detailed borrower dossier card, where all fields segment and layout exactly as shown on the printed SHBFinance form template.

## Contract impact
Contract updated. Modifying `DeclaredForm` in `state.py` required updating `api.ts` in step with the changes. Both are fully synchronized.

## Follow-ups / TODO
- [ ] Ensure any newly parsed OCR fields (from future document uploads) align with the segmented address properties if granular data extraction becomes a requirement.

## Gotchas
- Commas are used to parse/split the single address strings (`permanent_address` and `current_address`) into segmented fields (Street, Ward, District, Province) for visual fidelity in the paper form mockup. Ensure mock data keeps a consistent comma structure.
