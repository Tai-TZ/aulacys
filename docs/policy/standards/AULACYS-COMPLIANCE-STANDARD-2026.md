# AULACYS Compliance Standard 2026

- Standard ID: `AULACYS-COMPLIANCE-STANDARD`
- Version: `2026.1`
- Effective from: `2026-07-19`
- Scope: synthetic retail-loan demo data and policy evaluation
- Status: internal demo standard; not an SHB policy or legal opinion

This document is the decision reference for the synthetic Compliance dataset. A result is reproducible only when its facts, rule IDs, standard sections, and policy versions are recorded together.

## KYC-01 - Identity and consent gate

Automated assessment requires a valid 12-digit identifier, an identity document marked verified by the configured KYC source, and data-processing consent. Missing or invalid evidence is blocking for automated processing.

Required fact: `kyc_verified` plus identity and consent evidence.

## UBO-01 - Related-party control

For an individual retail borrower, UBO may be not applicable. A related-party flag or unresolved ownership/control fact requires review and must not be silently treated as clear.

Required fact: `ubo_clear`.

## AML-01 - Sanctions screening

A confirmed match in the versioned synthetic sanctions dataset is blocking. The result must retain the screened identity and dataset source.

Required fact: `sanctions_match_count`; compliant value: `0`.

## AML-02 - PEP screening

A PEP match triggers enhanced due diligence and human review; it does not by itself reject the loan.

Required fact: `pep_match_count`; compliant value: `0`.

## CREDIT-01 - CIC quality

CIC group must be at or below the configured threshold and the bad-debt flag must be clear. CIC facts come from the CIC tool result, not model prose.

Required facts: `cic_group`, `has_bad_debt`.

## CREDIT-02 - Repayment capacity

DTI is calculated by a deterministic tool from verified monthly income and monthly debt obligations. Its threshold is product/profile appetite data.

Required facts: `dti`, `income_verified`.

## DOC-01 - Required evidence

All documents declared by the selected product configuration must be present. Presence does not imply authenticity; authenticity uses a separate verification fact.

Required fact: `docs_complete`.

## PRODUCT-01 - Package limits

Requested amount and tenor must remain within product configuration. Limits live in YAML/catalog data and are not recalled by an LLM.

Required facts: `amount_within_product_ceiling` when applicable and `term_within_product_max`.

## SHB-BM04-OD-01 - Online unsecured overdraft controls

Source artifact: `4.BM04-DKDK-TC-ONLINE.pdf`, SHA-256 `EA50C72CA63794559ED454627B4A2E2C775C69D91C17B8D0C980F73A1B2446D7`, reviewed 2026-07-19.

Applicable only to an online unsecured overdraft package unless another product explicitly adopts the same control:

- Page 7, clause 7.2(c): no overdue debt of 10 days or more at any credit institution during the 30 days before registration.
- Page 3, clause 6.2(a)(i): missing, late, fraudulent, or untruthful supporting documents may cause refusal or termination.
- Pages 3 and 7: the borrower must satisfy disbursement conditions and use funds for the declared purpose.
- Page 10, clause 11.2(a,d): the borrower confirms civil capacity and acceptance of personal-data processing terms.

The PDF is a product/contract control reference. It is not evidence that a specific identity is genuine and is not a sanctions or PEP dataset.

## Decision semantics

- `clean`: no violations.
- `warning`: at least one non-blocking violation; route to HITL.
- `veto`: at least one verified blocking violation.
- Missing required metric: fail closed as blocking for automated assessment.

## Golden-case governance

Golden cases live in `eval/golden/compliance/`. Each records the standard version, policy profile, metrics, and exact expected rule IDs. A policy or standard change must update its golden cases in the same change.
