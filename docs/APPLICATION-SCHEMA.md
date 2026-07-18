# Application schema — from the REAL SHBFinance form (not guessed)

> Derived from `form_denghi_vay_06.2026.pdf` (SHBFinance — cá nhân vay **không có TSBĐ**),
> Section A (Phần Đề nghị vay vốn). Replaces the guessed `DeclaredForm` in `state.py`
> (8 fields) with the ~40 real fields the form actually collects. This is **application
> intake** data — a new bounded context.

## 0. Owner + product mapping

- **Owner:** new **`application-svc`** (schema `application`) — the loan-application/intake
  store. (Alternative: extend `los-svc`, since LOS = origination. Recommend a dedicated
  service — intake is a distinct bounded context from the decision ticket.)
- **Product:** this form is **unsecured consumer** → maps to `retail_unsecured_salary`
  (no collateral section on the form). Mortgage forms would add a collateral schema.
- **⚠️ PII:** the whole applicant tree is sensitive personal data + a consent section →
  RLS + field masking + consent tracking are mandatory (`SECURITY.md` §5). Never log/trace.

## 1. Form → tables (Section A)

| Form part | Table |
|-----------|-------|
| header (Số hợp đồng) + II total | `loan_application` |
| I.1 Bên vay | `applicant` |
| I.2.1 phones | `applicant_phone` |
| I.2.2 addresses (current + permanent) | `applicant_address` |
| I.3 việc làm | `employment` |
| I.4 người tham chiếu (×2) | `reference_person` |
| I.5 vợ/chồng | `spouse` |
| I.6 năng lực tài chính | `financial_capacity` |
| I.7 cung cấp thông tin (consent) | `consent` |
| II.1/II.2 mục đích vay | `loan_purpose` |
| II.1.2 chi tiết hàng hóa | `purpose_goods` |
| II.x.3 phương thức giải ngân | `disbursement` |
| Phần nhân viên SHBFinance | `sales_info` |
| Chứng từ / checklist (workspace + assess) | `application_document` |

## 2. DDL (schema `application`)

```sql
CREATE TABLE loan_application (
    id            uuid PRIMARY KEY,
    contract_no   text,                       -- Số hợp đồng (assigned later)
    product       text NOT NULL DEFAULT 'retail_unsecured_salary',
    total_amount  numeric(18,0) NOT NULL,     -- Tổng số tiền đề nghị vay (VNĐ)
    term_months   integer NOT NULL,           -- Thời hạn vay yêu cầu
    lending_method text NOT NULL DEFAULT 'per_loan',   -- Cho vay từng lần
    status        text NOT NULL DEFAULT 'submitted',   -- draft|submitted|assessing|approved|rejected
    created_at    timestamptz NOT NULL DEFAULT now(),
    submitted_at  timestamptz
);

CREATE TABLE applicant (
    application_id uuid PRIMARY KEY REFERENCES loan_application(id),
    full_name      text NOT NULL,
    dob            date,
    gender         text,                       -- nam|nu
    id_number      text NOT NULL,              -- CCCD/CC  (PII — mask)
    id_issue_date  date,
    id_issue_place text,
    old_id_number  text,                       -- CMND/CCCD cũ
    email          text
);

CREATE TABLE applicant_phone (
    application_id uuid PRIMARY KEY REFERENCES loan_application(id),
    mobile_1   text NOT NULL,
    mobile_2   text,
    zalo_phone text
);

CREATE TABLE applicant_address (
    id             uuid PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES loan_application(id),
    kind           text NOT NULL,              -- current | permanent
    street         text, ward text, district text, province text,
    same_as_permanent boolean DEFAULT false
);

CREATE TABLE employment (
    application_id uuid PRIMARY KEY REFERENCES loan_application(id),
    occupation   text,     -- lao_dong_tu_do|cong_chuc|sinh_vien|tu_doanh|can_bo_dn|huu_tri|ho_kd|cong_nhan|noi_tro|khac
    employer_name text,
    position     text,      -- can_bo_ql | nhan_vien | khac
    work_address text,
    salary_day   text       -- Ngày nhận lương hàng tháng
);

CREATE TABLE reference_person (
    id             uuid PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES loan_application(id),
    seq            integer NOT NULL,           -- 1 | 2
    full_name      text NOT NULL,
    relationship   text,
    phone          text,
    same_address   boolean DEFAULT false
);

CREATE TABLE spouse (
    application_id uuid PRIMARY KEY REFERENCES loan_application(id),
    full_name     text,
    phone         text,
    id_number     text,                        -- PII — mask
    income        numeric(18,0),               -- VNĐ/tháng
    employer_name text,
    employer_phone text
);

CREATE TABLE financial_capacity (
    application_id  uuid PRIMARY KEY REFERENCES loan_application(id),
    total_income    numeric(18,0) NOT NULL,    -- Tổng thu nhập VNĐ/tháng
    personal_expense numeric(18,0)             -- Chi phí cá nhân VNĐ/tháng
);

CREATE TABLE consent (
    application_id          uuid PRIMARY KEY REFERENCES loan_application(id),
    data_processing_consent boolean NOT NULL,  -- I.7 đồng ý xử lý dữ liệu cá nhân
    marketing_consent       boolean NOT NULL DEFAULT false,
    consent_version         text,              -- ĐKĐK version on the website
    consent_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE loan_purpose (
    id             uuid PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES loan_application(id),
    category       text NOT NULL,              -- consumer (tiêu dùng) | living (đời sống)
    amount         numeric(18,0) NOT NULL,     -- Nhu cầu vốn
    purpose_detail text,                        -- du_lich|sua_nha|phuong_tien|kham_benh|hoc_tap|... (enum per category)
    prepaid_amount numeric(18,0)                -- số tiền trả trước cho Bên bán
);

CREATE TABLE purpose_goods (             -- II.1.2 chi tiết hàng hóa/dịch vụ
    id          uuid PRIMARY KEY,
    purpose_id  uuid NOT NULL REFERENCES loan_purpose(id),
    seq         integer NOT NULL,
    name        text,                          -- tên hàng hóa/dịch vụ
    brand       text,                          -- nhãn hiệu
    serial_imei text,                          -- số khung/IMEI/serial
    value       numeric(18,0)                  -- giá trị VNĐ
);

CREATE TABLE disbursement (
    id             uuid PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES loan_application(id),
    for_category   text,                        -- consumer | living
    method         text NOT NULL,               -- beneficiary | borrower | cash | other
    bank           text, branch text, account_no text, account_name text,
    beneficiary_name text, beneficiary_tax_id text
);

CREATE TABLE sales_info (                 -- Phần dành cho nhân viên SHBFinance
    application_id uuid PRIMARY KEY REFERENCES loan_application(id),
    dsa_code       text,                        -- DSA/Telesales code
    witness_phone  text,
    branch_pos_hub text
);

CREATE TABLE application_document (       -- checklist / uploads (UI DOSSIER_DOCS)
    id             uuid PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES loan_application(id),
    doc_type       text NOT NULL,              -- cccd | income | cic | purpose_evidence | ...
    title          text,
    status         text NOT NULL DEFAULT 'missing',  -- missing|uploaded|verified
    required_for   text,                        -- KYC | Credit · DTI | ...
    storage_uri    text,                        -- object path / URL when uploaded
    tier           integer,                     -- assess Document.tier (1|2|3)
    confirmed_by   text,                        -- officer id for tier-3
    uploaded_at    timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now()
);
```

Indexes: `applicant(id_number)`, `loan_application(status)`, `application_document(application_id)`, FK columns.

## 3. What feeds the agents (why each field matters)

| Agent | Reads from |
|-------|-----------|
| Credit | `financial_capacity.total_income`, `personal_expense`, `employment`, `spouse.income` → DTI; `applicant.id_number` → CIC lookup |
| Compliance | `loan_purpose.purpose_detail` → prohibited-purpose check; `applicant.full_name` → AML; `consent.data_processing_consent` **must be true** to proceed |
| Operations | (n/a for unsecured — no collateral) |

**Consent is a hard gate:** if `data_processing_consent = false`, the flow must stop
(cannot process PII). Add it as a pre-check before any agent runs.

## 4. Current vs real (the "tự suy diễn" gap)

| Current `DeclaredForm` (8) | Real form (Section A, ~40) |
|----------------------------|----------------------------|
| customer_name, amount, term_months, annual_rate, monthly_income, existing_monthly_debt, declared_purpose, collateral_value_declared | + id_number/issue, gender/dob, phones, 2 addresses, employment, 2 references, spouse, personal_expense, consent, purpose category+detail, goods line-items, disbursement, sales info |

`annual_rate` / `collateral_value_declared` are **not on this form** (rate is decided by
SHBFinance in Part B; no collateral for unsecured). Keep the guessed fields only where the
form has them; take the rest from the form.

## 5. Plan

| Phase | Step | Status |
|-------|------|--------|
| 1 | New `application-svc` (schema `application`) + models + Alembic `0001` | ✅ done (`services/application-svc`, :8360) |
| 1b | `application_document` checklist table (Alembic `0002`) | ✅ done |
| 2 | `POST /applications` intake endpoint (validates consent = true) | ✅ done (+ `GET /applications/{id}`) |
| 3 | Orchestrator reads the application (by id) instead of `seed_application` | ✅ done (`application_client` + `POST /assess/application` with `application_id`) |
| 4 | Map `financial_capacity`/`employment` → Credit metrics; `loan_purpose` → Compliance | ✅ partial (mapper in `application_client`; employment unused yet) |
| 5 | RLS + PII masking (`SECURITY.md`) — `id_number`, `income`, addresses masked per role | pending |
| 6 | **auth-svc** (missing) — issue JWT with role/branch so RLS + consent audit work | pending |

> The form is the source of truth for the schema. Design from it, not from the demo seed.
