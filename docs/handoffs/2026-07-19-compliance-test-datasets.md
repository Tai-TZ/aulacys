# Handoff - Compliance test datasets

- **Date:** 2026-07-19
- **Author:** Codex
- **Branch / PR:** `feat/catalog-crud-dossier-db` / PR not opened
- **Status:** Done

## What changed & why

Added versioned, explicitly synthetic KYC and CIC datasets plus an AML/PEP test snapshot with source provenance. Each dataset now contains exactly 100 records: KYC 100, AML 50 sanctions + 50 PEP, and CIC 100 balanced across groups 1-5. The datasets cover every decision branch needed by the retail compliance demo without committing real personal or credit data.

## Files touched

- `packages/shared/aulacys/agents/resources/compliance/kyc_records.json` - 100 Vietnamese synthetic customer profiles using the 15-field KYC profile schema.
- `packages/shared/aulacys/agents/tools/kyc.py` - validate profile completeness and expose initial risk/PEP review flags; biometric results no longer live in the customer profile dataset.
- `services/aml-svc/seed/aml_lists.json` - 50 sanctions and 50 PEP fixtures with aliases, identifiers, programs, and source URLs.
- `services/aml-svc/app/services/aml.py` - normalized name/alias matching and provenance in results.
- `services/cic-svc/seed/cic_records.json` - 100 borrowers, 20 per group 1-5, with debt obligations, arrears, utilization inputs, and metadata.
- `services/cic-svc/app/services/cic.py` and `app/schemas/cic.py` - expose status, dataset version, evidence ID, and whether an exact record was found.
- `packages/shared/aulacys/agents/tools/cic.py` - align fallback provenance fields.
- `docs/DATASETS-COMPLIANCE.md` - dataset inventory, safety boundary, and production ingestion notes.
- Service/shared tests - coverage for clean, expired, revoked, liveness failure, alias sanctions, PEP, CIC groups, consent, and unknown records.

## How to run / verify

```powershell
cd D:\aulacys
$env:PYTHONPATH='packages/shared'
.\apps\api\.venv\Scripts\python.exe -m pytest packages/shared/tests -q

cd services\aml-svc
..\..\apps\api\.venv\Scripts\python.exe -m pytest tests -q

cd ..\cic-svc
..\..\apps\api\.venv\Scripts\python.exe -m pytest tests -q

cd ..\orchestrator-svc
$env:PYTHONPATH='../../packages/shared;.'
..\..\apps\api\.venv\Scripts\python.exe -m pytest tests -q
```

Expected: shared `96 passed`, AML `3 passed`, CIC `11 passed`, orchestrator `34 passed`. Golden compliance evaluation remains `5/5`.

## Contract impact

No new public frontend contract in this dataset slice. CIC service responses gained `status`, `dataset_version`, `evidence_id`, and `record_found`; this is an internal service contract consumed as an extensible dictionary by the agent tool.

## Follow-ups / TODO

- [ ] Add scheduled official UN/OFAC/EU/UK download jobs with checksum and immutable snapshots.
- [ ] Obtain licensing approval before using an aggregated PEP dataset commercially.
- [ ] Replace synthetic KYC/CIC providers only through authorized integrations; never scrape personal records.

## Gotchas

The AML records are test fixtures shaped like public sources, not a current sanctions list. The KYC file is a customer-profile dataset, not proof that identity, face match, or liveness succeeded; those belong in separate eKYC evidence datasets/services. Unknown CIC identities use an explicitly labelled synthetic default so demo flows remain available. Never rename the KYC resource directory to `data/` because the repository `.gitignore` excludes directories with that name.
