# Handoff — KYC avatar + eKYC face compare

- **Date:** 2026-07-19
- **Author:** Cursor Auto
- **Branch / PR:** local working tree / PR not opened
- **Status:** ✅ Done

## What changed & why

Customer KYC profiles now store an enrolled eKYC face as `avatar` (image path/URL). At dossier verification, Compliance passes that avatar (or a live `selfie`/`avatar` document) into `ekyc_face_match`, which compares against the enrolled avatar and applies the seeded Face Match score (threshold 85). Mismatch or missing avatar fail-closed.

## Files touched

- `packages/shared/aulacys/agents/resources/compliance/kyc_records.json` — `avatar` on all 100 profiles (v2026.2)
- `packages/shared/aulacys/agents/resources/compliance/add_kyc_avatars.py` — one-shot enricher
- `packages/shared/aulacys/agents/tools/kyc.py` — require/return `avatar`
- `packages/shared/aulacys/agents/tools/ekyc.py` — compare `avatar` ↔ enrolled
- `packages/shared/aulacys/agents/nodes/compliance.py` — pass avatar into tool
- tests + `docs/DATASETS-COMPLIANCE.md` + sync script

## How to run / verify

```powershell
cd D:\aulacys
$env:PYTHONPATH='packages/shared'
.\apps\api\.venv\Scripts\python.exe -m pytest packages/shared/tests -q
```

Demo CCCDs with real public images: `074300004128` → `/aulacys/cccd-be-hoa.png`, etc.

## Contract impact

none (agent tool dict only)

## Follow-ups / TODO

- [ ] Persist `avatar` on `application-svc` applicant table if dossiers should store a copy
- [ ] Replace path-equality demo match with a real face-match provider

## Gotchas

Demo match is **path equality** of avatar URLs/paths, not pixel CV. Wrong selfie path ⇒ `avatar_mismatch` even if score seed is high.
