# Compliance test datasets

All KYC and CIC identities in this repository are synthetic. They do not represent real people and must never be merged with production customer data.

| Dataset | Location | Version | Coverage |
|---|---|---|---|
| KYC | `packages/shared/aulacys/agents/resources/compliance/kyc_records.json` | 2026.2 | 100 customer profiles + enrolled eKYC `avatar` path; identity, address, occupation, declared income, onboarding, risk level, PEP |
| eKYC Face Match | `packages/shared/aulacys/agents/resources/compliance/ekyc_face_match.json` | 2026.1 | 100 Face Match scores (threshold 85); tool compares dossier avatar ↔ KYC enrolled avatar |
| Customer geo | `packages/shared/aulacys/agents/resources/compliance/customer_geo.json` | 2026.1 | 100 customer lat/lon + province for radius check |
| Branches | `packages/shared/aulacys/agents/resources/compliance/branches.json` | 2026.1 | Synthetic SHB CN/PGD coordinates (50 km radius) |
| AML | `services/aml-svc/seed/aml_lists.json` | 2026.1 | 100 records: 50 sanctions + 50 PEP, aliases, identifiers, provenance |
| CIC | `services/cic-svc/seed/cic_records.json` | 2026.2 | 100 records (20/group): `customer_id`, `debt_group`, `outstanding_debt`, `overdue_history`, `number_of_institutions`, Vietnamese names linked to KYC where CCCD matches |

Every service response must expose `dataset_version`, `evidence_id`, `source`, and `computed_at`. Missing or invalid datasets are not a clean result; callers must use the existing unavailable/invalid path and route the application to human review.

The AML snapshot is a deterministic test fixture shaped like public sanctions data. It is not a current sanctions list. Production ingestion must download official sources, preserve the source URL/hash/retrieved time, and run separate licensing review for aggregated PEP data.
