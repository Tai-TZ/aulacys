-- =============================================================================
-- Online Consumer Lending System — PostgreSQL Schema
-- Source: online_lending_erd.mmd
-- Compatible: PostgreSQL 15+ / SQLAlchemy 2.0 async / Alembic 1.14+
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Custom ENUMs
-- ---------------------------------------------------------------------------

CREATE TYPE loan_type AS ENUM (
    'UNSECURED',        -- tín chấp
    'SECURED_SAVINGS'   -- cầm cố tiết kiệm
);

CREATE TYPE loan_channel AS ENUM (
    'MOBILE_APP',
    'WEB',
    'THIRD_PARTY_API'
);

CREATE TYPE application_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'KYC_PENDING',
    'KYC_PASSED',
    'KYC_FAILED',
    'SCORING',
    'APPROVED',
    'DECLINED',
    'OFFER_SENT',
    'OFFER_ACCEPTED',
    'CONTRACT_SIGNED',
    'DISBURSED',
    'CANCELLED',
    'WITHDRAWN'
);

CREATE TYPE kyc_status AS ENUM (
    'STARTED',
    'ID_UPLOADED',
    'LIVENESS_DONE',
    'FACE_MATCHED',
    'PASSED',
    'FAILED',
    'EXPIRED'
);

CREATE TYPE kyc_method AS ENUM (
    'CCCD_NFC',         -- chip-based NFC read
    'CCCD_OCR',         -- photo OCR
    'CMND_OCR'          -- old ID card OCR
);

CREATE TYPE contract_status AS ENUM (
    'PENDING_SIGNATURE',
    'SIGNED',
    'ACTIVE',
    'SETTLED',
    'WRITTEN_OFF',
    'CANCELLED'
);

CREATE TYPE income_type AS ENUM (
    'SALARY',
    'FREELANCE',
    'BUSINESS',
    'PENSION',
    'OTHER'
);

CREATE TYPE contract_type AS ENUM (
    'PERMANENT',
    'FIXED_TERM',
    'PROBATION',
    'FREELANCE'
);

CREATE TYPE collateral_type AS ENUM (
    'SAVINGS_DEPOSIT'   -- cầm cố sổ tiết kiệm (only type for online)
);

CREATE TYPE decision AS ENUM (
    'APPROVED',
    'DECLINED',
    'REFER_MANUAL'
);

CREATE TYPE fraud_result AS ENUM (
    'PASS',
    'FLAG',
    'BLOCK'
);

CREATE TYPE sanctions_result AS ENUM (
    'CLEAR',
    'HIT',
    'POSSIBLE_HIT'
);

CREATE TYPE repayment_status AS ENUM (
    'SCHEDULED',
    'PAID',
    'PARTIALLY_PAID',
    'OVERDUE',
    'WAIVED'
);

CREATE TYPE disbursement_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'REVERSED'
);

CREATE TYPE notification_channel AS ENUM (
    'PUSH',
    'SMS',
    'EMAIL',
    'IN_APP'
);

CREATE TYPE notification_status AS ENUM (
    'QUEUED',
    'SENT',
    'DELIVERED',
    'FAILED',
    'READ'
);

CREATE TYPE consent_type AS ENUM (
    'CIC_INQUIRY',          -- consent to query CIC bureau
    'DATA_SHARING',         -- share data with CIC for reporting
    'MARKETING',            -- receive marketing messages
    'THIRD_PARTY_SCORING',  -- share data with scoring partner
    'ESIGN'                 -- consent to electronic signature
);

CREATE TYPE ticket_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);

CREATE TYPE ticket_category AS ENUM (
    'APPLICATION_INQUIRY',
    'REPAYMENT_ISSUE',
    'CONTRACT_DISPUTE',
    'FRAUD_REPORT',
    'ACCOUNT_ISSUE',
    'OTHER'
);

-- =============================================================================
-- LAYER 1 — Product & Configuration
-- =============================================================================

CREATE TABLE loan_purpose_categories (
    code        TEXT PRIMARY KEY,
    name_vi     TEXT NOT NULL,
    name_en     TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE loan_purpose_categories IS 'Standardised loan purpose codes: du lịch, mua sắm, xây/sửa nhà, tiêu dùng cá nhân.';

INSERT INTO loan_purpose_categories (code, name_vi, name_en) VALUES
    ('CONSUMER',    'Tiêu dùng cá nhân',       'Personal consumption'),
    ('TRAVEL',      'Du lịch',                  'Travel'),
    ('SHOPPING',    'Mua sắm',                  'Shopping'),
    ('RENOVATION',  'Xây/Sửa nhà',              'Home renovation'),
    ('MEDICAL',     'Y tế',                     'Medical'),
    ('EDUCATION',   'Giáo dục',                 'Education'),
    ('EMERGENCY',   'Khẩn cấp',                 'Emergency'),
    ('OTHER',       'Khác',                     'Other');

-- ---------------------------------------------------------------------------
CREATE TABLE loan_products (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT        NOT NULL UNIQUE,
    name            TEXT        NOT NULL,
    loan_type       loan_type   NOT NULL DEFAULT 'UNSECURED',
    min_amount      NUMERIC(20,2) NOT NULL CHECK (min_amount > 0),
    max_amount      NUMERIC(20,2) NOT NULL CHECK (max_amount >= min_amount),
    min_term_months INTEGER     NOT NULL CHECK (min_term_months > 0),
    max_term_months INTEGER     NOT NULL CHECK (max_term_months >= min_term_months),
    channel         loan_channel NOT NULL DEFAULT 'MOBILE_APP',
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  loan_products           IS 'Loan product catalogue. Each product defines the lending envelope.';
COMMENT ON COLUMN loan_products.code      IS 'Short code, e.g. PIL_CONSUMER, PIL_SAVINGS.';
COMMENT ON COLUMN loan_products.loan_type IS 'UNSECURED = tín chấp; SECURED_SAVINGS = cầm cố tiết kiệm.';

-- Junction: product ↔ allowed purposes
CREATE TABLE loan_product_purposes (
    product_id      UUID NOT NULL REFERENCES loan_products(id) ON DELETE CASCADE,
    purpose_code    TEXT NOT NULL REFERENCES loan_purpose_categories(code) ON DELETE CASCADE,
    PRIMARY KEY (product_id, purpose_code)
);

-- ---------------------------------------------------------------------------
CREATE TABLE interest_rate_tiers (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID        NOT NULL REFERENCES loan_products(id) ON DELETE CASCADE,
    tier_code           TEXT        NOT NULL,
    min_credit_score    NUMERIC(6,2),
    max_credit_score    NUMERIC(6,2),
    income_band         TEXT,           -- e.g. '5M-10M', '10M+' (VND/month)
    annual_rate_pct     NUMERIC(6,4)    NOT NULL CHECK (annual_rate_pct > 0),
    effective_from      DATE        NOT NULL,
    effective_until     DATE,
    UNIQUE (product_id, tier_code)
);

COMMENT ON TABLE  interest_rate_tiers              IS 'Rate bands by credit score + income band. Always query with effective date filter.';
COMMENT ON COLUMN interest_rate_tiers.annual_rate_pct IS 'Annual interest rate as a decimal, e.g. 0.1800 = 18%/year.';

CREATE INDEX idx_irt_product_id ON interest_rate_tiers(product_id);
CREATE INDEX idx_irt_effective  ON interest_rate_tiers(effective_from, effective_until);

-- ---------------------------------------------------------------------------
CREATE TABLE eligibility_rules (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID    NOT NULL REFERENCES loan_products(id) ON DELETE CASCADE,
    rule_code           TEXT    NOT NULL,
    attribute           TEXT    NOT NULL,   -- e.g. 'customer.age', 'cic.cic_group', 'income.monthly_income'
    operator            TEXT    NOT NULL CHECK (operator IN ('>=', '<=', '=', '<', '>', 'IN', 'NOT_IN')),
    threshold_value     TEXT    NOT NULL,
    is_hard_block       BOOLEAN NOT NULL DEFAULT TRUE,
    decline_reason_code TEXT,
    UNIQUE (product_id, rule_code)
);

COMMENT ON TABLE  eligibility_rules              IS 'Per-product eligibility checks run by the decisioning engine.';
COMMENT ON COLUMN eligibility_rules.is_hard_block IS 'TRUE = auto-decline on fail; FALSE = soft flag for manual review.';

CREATE INDEX idx_er_product_id ON eligibility_rules(product_id);

-- =============================================================================
-- LAYER 2 — Customer & eKYC
-- =============================================================================

CREATE TABLE customers (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    cccd_number     TEXT        UNIQUE,
    phone           TEXT        NOT NULL UNIQUE,
    full_name       TEXT        NOT NULL,
    dob             DATE,
    gender          TEXT        CHECK (gender IN ('M', 'F', 'OTHER')),
    nationality     TEXT        NOT NULL DEFAULT 'VN',
    status          TEXT        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BLACKLISTED')),
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  customers             IS 'Registered borrower account. One customer can have multiple applications.';
COMMENT ON COLUMN customers.cccd_number IS 'Populated after first successful eKYC; NULL for pre-KYC registrations.';

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_cccd  ON customers(cccd_number);

-- ---------------------------------------------------------------------------
CREATE TABLE kyc_sessions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    provider        TEXT        NOT NULL,   -- e.g. 'VNPT_EKYD', 'FPT_AI', 'INTERNAL'
    method          kyc_method  NOT NULL,
    status          kyc_status  NOT NULL DEFAULT 'STARTED',
    failure_reason  TEXT,
    attempt_count   INTEGER     NOT NULL DEFAULT 1,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

COMMENT ON TABLE kyc_sessions IS 'One session per eKYC attempt. A customer may retry on failure.';

CREATE INDEX idx_kyc_customer_id  ON kyc_sessions(customer_id);
CREATE INDEX idx_kyc_status       ON kyc_sessions(status);

-- ---------------------------------------------------------------------------
CREATE TABLE id_documents (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    kyc_session_id      UUID    NOT NULL REFERENCES kyc_sessions(id) ON DELETE CASCADE,
    doc_type            TEXT    NOT NULL CHECK (doc_type IN ('CCCD', 'CMND', 'PASSPORT')),
    doc_number          TEXT    NOT NULL,
    front_image_url     TEXT    NOT NULL,
    back_image_url      TEXT,
    issue_date          DATE,
    expiry_date         DATE,
    issuing_authority   TEXT,
    ocr_fields          JSONB,  -- raw OCR output: name, dob, address, etc.
    is_valid            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  id_documents          IS 'ID card images and OCR results captured during eKYC.';
COMMENT ON COLUMN id_documents.ocr_fields IS 'Raw OCR JSON: {name, dob, address, gender, nationality, ...}';

CREATE INDEX idx_id_doc_kyc_session_id ON id_documents(kyc_session_id);

-- ---------------------------------------------------------------------------
CREATE TABLE liveness_checks (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    kyc_session_id  UUID    NOT NULL REFERENCES kyc_sessions(id) ON DELETE CASCADE,
    liveness_score  REAL    NOT NULL CHECK (liveness_score BETWEEN 0 AND 1),
    passed          BOOLEAN NOT NULL,
    video_url       TEXT,
    provider_ref    TEXT,
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE liveness_checks IS 'Face liveness detection result — confirms a live person, not a photo/video spoof.';

CREATE INDEX idx_liveness_kyc_session_id ON liveness_checks(kyc_session_id);

-- ---------------------------------------------------------------------------
CREATE TABLE face_match_results (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    kyc_session_id  UUID    NOT NULL REFERENCES kyc_sessions(id) ON DELETE CASCADE,
    similarity_score REAL   NOT NULL CHECK (similarity_score BETWEEN 0 AND 1),
    passed          BOOLEAN NOT NULL,
    provider_ref    TEXT,
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE face_match_results IS 'Selfie vs. ID card face comparison. Pass threshold typically >= 0.85.';

CREATE INDEX idx_face_match_kyc_session_id ON face_match_results(kyc_session_id);

-- ---------------------------------------------------------------------------
CREATE TABLE device_sessions (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    device_fingerprint  TEXT    NOT NULL,
    platform            TEXT,   -- 'iOS' | 'Android' | 'Web'
    os_version          TEXT,
    app_version         TEXT,
    ip_address          INET,
    latitude            NUMERIC(10,7),
    longitude           NUMERIC(10,7),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  device_sessions                IS 'App/web session metadata captured at login or application start.';
COMMENT ON COLUMN device_sessions.device_fingerprint IS 'Hashed device identifier; used for fraud velocity checks.';

CREATE INDEX idx_device_sessions_customer_id        ON device_sessions(customer_id);
CREATE INDEX idx_device_sessions_device_fingerprint ON device_sessions(device_fingerprint);

-- ---------------------------------------------------------------------------
CREATE TABLE bank_accounts (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    bank_code       TEXT    NOT NULL,   -- NAPAS bank code, e.g. 'TCB', 'BIDV', 'MB'
    account_number  TEXT    NOT NULL,
    account_name    TEXT    NOT NULL,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (bank_code, account_number)
);

COMMENT ON TABLE  bank_accounts            IS 'Customer bank accounts for disbursement. Verified via penny-drop or name-match API.';
COMMENT ON COLUMN bank_accounts.bank_code  IS 'NAPAS member bank code.';

CREATE INDEX idx_bank_accounts_customer_id ON bank_accounts(customer_id);
CREATE INDEX idx_bank_accounts_active      ON bank_accounts(customer_id) WHERE is_active = TRUE;

-- =============================================================================
-- LAYER 3 — Loan Application
-- =============================================================================

CREATE TABLE loan_applications (
    id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id             UUID                NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    product_id              UUID                NOT NULL REFERENCES loan_products(id) ON DELETE RESTRICT,
    kyc_session_id          UUID                NOT NULL REFERENCES kyc_sessions(id) ON DELETE RESTRICT,
    purpose_code            TEXT                REFERENCES loan_purpose_categories(code) ON DELETE SET NULL,
    bank_account_id         UUID                NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    requested_amount        NUMERIC(20,2)       NOT NULL CHECK (requested_amount > 0),
    requested_term_months   INTEGER             NOT NULL CHECK (requested_term_months > 0),
    channel                 loan_channel        NOT NULL,
    status                  application_status  NOT NULL DEFAULT 'DRAFT',
    submitted_at            TIMESTAMPTZ,
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT now()
);

COMMENT ON TABLE  loan_applications            IS 'Root aggregate for a borrower loan request. All downstream entities cascade from here.';
COMMENT ON COLUMN loan_applications.status     IS 'Lifecycle state machine — transitions driven by eKYC, decisioning, and contract events.';
COMMENT ON COLUMN loan_applications.channel    IS 'Where the application was initiated.';

CREATE INDEX idx_loan_app_customer_id ON loan_applications(customer_id);
CREATE INDEX idx_loan_app_product_id  ON loan_applications(product_id);
CREATE INDEX idx_loan_app_status      ON loan_applications(status);
CREATE INDEX idx_loan_app_submitted   ON loan_applications(submitted_at DESC) WHERE submitted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
CREATE TABLE application_form_steps (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID        NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    step_name       TEXT        NOT NULL,   -- 'PERSONAL_INFO' | 'INCOME' | 'PURPOSE' | 'ACCOUNT' | 'REVIEW'
    step_order      INTEGER     NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
    form_data       JSONB,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    UNIQUE (application_id, step_name)
);

COMMENT ON TABLE application_form_steps IS 'Multi-step form progress. Used for drop-off analytics and resumable sessions.';

CREATE INDEX idx_form_steps_application_id ON application_form_steps(application_id);

-- ---------------------------------------------------------------------------
CREATE TABLE income_statements (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id          UUID        NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE CASCADE,
    income_type             income_type NOT NULL,
    monthly_income          NUMERIC(20,2) NOT NULL CHECK (monthly_income >= 0),
    currency                TEXT        NOT NULL DEFAULT 'VND',
    payroll_bank_code       TEXT,
    payroll_account_number  TEXT,
    statement_url           TEXT,
    is_verified             BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  income_statements               IS 'Declared income per application. Verified via payroll account cross-check.';
COMMENT ON COLUMN income_statements.statement_url IS 'URL to uploaded bank statement or payslip image.';

-- ---------------------------------------------------------------------------
CREATE TABLE employment_info (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id          UUID            NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE CASCADE,
    employer_name           TEXT            NOT NULL,
    employer_tax_id         TEXT,
    contract_type           contract_type   NOT NULL,
    employment_start_date   DATE,
    position                TEXT,
    industry_code           TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE employment_info IS 'Employer and contract details. Used for eligibility (minimum tenure) and fraud scoring.';

-- ---------------------------------------------------------------------------
CREATE TABLE collaterals (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id      UUID            NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE CASCADE,
    collateral_type     collateral_type NOT NULL DEFAULT 'SAVINGS_DEPOSIT',
    savings_account_id  TEXT            NOT NULL,   -- savings account number being pledged
    pledged_amount      NUMERIC(20,2)   NOT NULL CHECK (pledged_amount > 0),
    maturity_date       DATE            NOT NULL,
    holding_bank_code   TEXT            NOT NULL,
    is_released         BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_collateral_not_expired CHECK (maturity_date >= CURRENT_DATE OR is_released = TRUE)
);

COMMENT ON TABLE  collaterals                IS 'Pledged savings deposit (cầm cố tiết kiệm). Only used for SECURED_SAVINGS loan type.';
COMMENT ON COLUMN collaterals.is_released    IS 'TRUE when the loan is settled and the pledge is lifted.';

-- =============================================================================
-- LAYER 4 — Credit Scoring & Decisioning
-- =============================================================================

CREATE TABLE cic_inquiries (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id          UUID    NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE CASCADE,
    inquiry_ref             TEXT,
    cic_group               INTEGER CHECK (cic_group BETWEEN 1 AND 5),
    total_outstanding_vnd   BIGINT  DEFAULT 0,
    num_active_loans        INTEGER DEFAULT 0,
    has_bad_debt            BOOLEAN NOT NULL DEFAULT FALSE,
    response_raw            JSONB,
    queried_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  cic_inquiries           IS 'Bureau inquiry result from CIC (Trung tâm Thông tin Tín dụng Quốc gia). Mandatory before disbursement.';
COMMENT ON COLUMN cic_inquiries.cic_group IS 'CIC debt classification 1=good → 5=bad. Groups 3–5 = auto-decline for most products.';

-- ---------------------------------------------------------------------------
CREATE TABLE credit_scores (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id      UUID    NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE CASCADE,
    scorecard_version   TEXT    NOT NULL,
    score               NUMERIC(7,2) NOT NULL,
    grade               TEXT    NOT NULL,   -- 'A', 'B', 'C', 'D', 'E'
    max_eligible_amount NUMERIC(20,2),
    dti_ratio           REAL    CHECK (dti_ratio BETWEEN 0 AND 1),
    scored_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  credit_scores           IS 'Internal scorecard output. Determines eligible amount and rate tier.';
COMMENT ON COLUMN credit_scores.dti_ratio IS 'Debt-to-income ratio at time of scoring. Must be ≤ 0.50 for approval.';

-- ---------------------------------------------------------------------------
CREATE TABLE fraud_checks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID        NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE CASCADE,
    provider        TEXT        NOT NULL,
    result          fraud_result NOT NULL,
    risk_score      REAL        CHECK (risk_score BETWEEN 0 AND 1),
    flags           JSONB,      -- e.g. {"device_reuse": true, "velocity_flag": false}
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  fraud_checks      IS 'Device + identity fraud signals. BLOCK result = auto-decline and customer blacklist.';
COMMENT ON COLUMN fraud_checks.flags IS 'JSON object of individual fraud signals with boolean values.';

-- ---------------------------------------------------------------------------
CREATE TABLE sanctions_checks (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID                NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE CASCADE,
    provider        TEXT                NOT NULL,
    result          sanctions_result    NOT NULL,
    is_hit          BOOLEAN             NOT NULL DEFAULT FALSE,
    hit_detail      TEXT,
    checked_at      TIMESTAMPTZ         NOT NULL DEFAULT now()
);

COMMENT ON TABLE  sanctions_checks        IS 'AML/PEP/sanctions screening. Required by Luật PCRT 2022. HIT = auto-decline + SAR filing.';
COMMENT ON COLUMN sanctions_checks.result IS 'CLEAR = no match; POSSIBLE_HIT = needs manual review; HIT = confirmed match.';

-- ---------------------------------------------------------------------------
CREATE TABLE decisioning_runs (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id          UUID        NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE CASCADE,
    engine_version          TEXT        NOT NULL,
    decision                decision    NOT NULL,
    decline_reason_code     TEXT,
    decline_reason_detail   TEXT,
    decided_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  decisioning_runs            IS 'Automated lending decision. REFER_MANUAL triggers human review queue.';
COMMENT ON COLUMN decisioning_runs.decision   IS 'APPROVED | DECLINED | REFER_MANUAL.';

-- ---------------------------------------------------------------------------
CREATE TABLE decisioning_rule_results (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    decisioning_run_id  UUID    NOT NULL REFERENCES decisioning_runs(id) ON DELETE CASCADE,
    rule_code           TEXT    NOT NULL,
    attribute           TEXT    NOT NULL,
    evaluated_value     TEXT,
    threshold_value     TEXT,
    passed              BOOLEAN NOT NULL,
    is_hard_block       BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE  decisioning_rule_results IS 'One row per eligibility rule evaluated in a decisioning run. Provides full audit trail of why a loan was approved or declined.';

CREATE INDEX idx_drr_decisioning_run_id ON decisioning_rule_results(decisioning_run_id);
CREATE INDEX idx_drr_failed_hard        ON decisioning_rule_results(decisioning_run_id) WHERE passed = FALSE AND is_hard_block = TRUE;

-- =============================================================================
-- LAYER 5 — Contract & Disbursement
-- =============================================================================

CREATE TABLE loan_offers (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id          UUID    NOT NULL UNIQUE REFERENCES loan_applications(id) ON DELETE CASCADE,
    approved_amount         NUMERIC(20,2) NOT NULL CHECK (approved_amount > 0),
    approved_term_months    INTEGER NOT NULL CHECK (approved_term_months > 0),
    annual_rate_pct         NUMERIC(6,4) NOT NULL CHECK (annual_rate_pct > 0),
    monthly_instalment      NUMERIC(20,2) NOT NULL,
    processing_fee          NUMERIC(20,2) NOT NULL DEFAULT 0,
    insurance_fee           NUMERIC(20,2) NOT NULL DEFAULT 0,
    valid_until             TIMESTAMPTZ NOT NULL,
    accepted                BOOLEAN NOT NULL DEFAULT FALSE,
    accepted_at             TIMESTAMPTZ,
    CONSTRAINT chk_offer_accepted_timing CHECK (
        (accepted = FALSE AND accepted_at IS NULL)
        OR (accepted = TRUE AND accepted_at IS NOT NULL)
    )
);

COMMENT ON TABLE  loan_offers             IS 'Approved offer sent to customer. Valid for a fixed window (typically 24–72h).';
COMMENT ON COLUMN loan_offers.valid_until IS 'Customer must accept before this timestamp or the offer expires.';

-- ---------------------------------------------------------------------------
CREATE TABLE loan_contracts (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id        UUID            NOT NULL UNIQUE REFERENCES loan_offers(id) ON DELETE RESTRICT,
    contract_number TEXT            NOT NULL UNIQUE,
    status          contract_status NOT NULL DEFAULT 'PENDING_SIGNATURE',
    pdf_url         TEXT,
    effective_date  DATE,
    maturity_date   DATE,
    signed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT chk_contract_dates CHECK (
        maturity_date IS NULL OR effective_date IS NULL OR maturity_date > effective_date
    )
);

COMMENT ON TABLE  loan_contracts                IS 'The binding e-contract. Once SIGNED, generates the repayment schedule.';
COMMENT ON COLUMN loan_contracts.contract_number IS 'Sequential contract ID, e.g. PIL-2026-000001. Used as the CIC reporting reference.';

CREATE INDEX idx_loan_contracts_status ON loan_contracts(status);

-- ---------------------------------------------------------------------------
CREATE TABLE esign_events (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID    NOT NULL REFERENCES loan_contracts(id) ON DELETE CASCADE,
    method          TEXT    NOT NULL CHECK (method IN ('OTP_SMS', 'OTP_EMAIL', 'BIOMETRIC', 'QUALIFIED_ESIGN')),
    otp_ref         TEXT,
    otp_sent_at     TIMESTAMPTZ,
    confirmed_at    TIMESTAMPTZ,
    success         BOOLEAN NOT NULL DEFAULT FALSE,
    failure_reason  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  esign_events         IS 'Each OTP/biometric signature attempt for the e-contract. Per BIDV SmartBanking step 5.';
COMMENT ON COLUMN esign_events.method  IS 'OTP_SMS is standard; QUALIFIED_ESIGN for high-value loans per Luật GDĐT 2023.';

CREATE INDEX idx_esign_contract_id ON esign_events(contract_id);

-- ---------------------------------------------------------------------------
CREATE TABLE disbursements (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID                NOT NULL UNIQUE REFERENCES loan_contracts(id) ON DELETE RESTRICT,
    bank_account_id UUID                NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    amount          NUMERIC(20,2)       NOT NULL CHECK (amount > 0),
    transfer_ref    TEXT                UNIQUE,
    status          disbursement_status NOT NULL DEFAULT 'PENDING',
    initiated_at    TIMESTAMPTZ         NOT NULL DEFAULT now(),
    disbursed_at    TIMESTAMPTZ
);

COMMENT ON TABLE disbursements IS 'Actual fund transfer to the borrower account. Status COMPLETED triggers repayment schedule activation.';

CREATE INDEX idx_disbursements_status ON disbursements(status);

-- =============================================================================
-- LAYER 6 — Repayment
-- =============================================================================

CREATE TABLE repayment_schedules (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID                NOT NULL REFERENCES loan_contracts(id) ON DELETE CASCADE,
    instalment_no   INTEGER             NOT NULL CHECK (instalment_no > 0),
    due_date        DATE                NOT NULL,
    principal       NUMERIC(20,2)       NOT NULL CHECK (principal >= 0),
    interest        NUMERIC(20,2)       NOT NULL CHECK (interest >= 0),
    total_due       NUMERIC(20,2)       NOT NULL,
    balance_after   NUMERIC(20,2)       NOT NULL CHECK (balance_after >= 0),
    status          repayment_status    NOT NULL DEFAULT 'SCHEDULED',
    UNIQUE (contract_id, instalment_no)
);

COMMENT ON TABLE  repayment_schedules           IS 'Amortisation plan. Generated upon disbursement. One row per instalment.';
COMMENT ON COLUMN repayment_schedules.total_due IS 'principal + interest + any applicable fees for this instalment.';

CREATE INDEX idx_repayment_schedules_contract_id ON repayment_schedules(contract_id);
CREATE INDEX idx_repayment_schedules_due_date    ON repayment_schedules(due_date) WHERE status = 'SCHEDULED';

-- ---------------------------------------------------------------------------
CREATE TABLE repayment_transactions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID        NOT NULL REFERENCES loan_contracts(id) ON DELETE CASCADE,
    schedule_id     UUID        REFERENCES repayment_schedules(id) ON DELETE SET NULL,
    amount_paid     NUMERIC(20,2) NOT NULL CHECK (amount_paid > 0),
    channel         TEXT        NOT NULL,   -- 'AUTO_DEBIT' | 'E_WALLET' | 'TRANSFER' | 'COUNTER'
    transaction_ref TEXT        UNIQUE,
    status          TEXT        NOT NULL DEFAULT 'COMPLETED',
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  repayment_transactions           IS 'Each payment received against the contract. May cover one or more instalments.';
COMMENT ON COLUMN repayment_transactions.channel   IS 'Payment method used by borrower.';

CREATE INDEX idx_repayment_transactions_contract_id ON repayment_transactions(contract_id);
CREATE INDEX idx_repayment_transactions_schedule_id ON repayment_transactions(schedule_id);

-- ---------------------------------------------------------------------------
CREATE TABLE overdue_records (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id             UUID    NOT NULL REFERENCES repayment_schedules(id) ON DELETE CASCADE,
    dpd                     INTEGER NOT NULL CHECK (dpd >= 0),
    penalty_fee_accrued     NUMERIC(20,2) NOT NULL DEFAULT 0,
    resolved                BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  overdue_records     IS 'Overdue tracking. Created when a scheduled instalment is not paid by due_date.';
COMMENT ON COLUMN overdue_records.dpd IS 'Days Past Due at time of record creation or last update.';

CREATE INDEX idx_overdue_records_schedule_id ON overdue_records(schedule_id);
CREATE INDEX idx_overdue_records_unresolved  ON overdue_records(schedule_id) WHERE resolved = FALSE;

-- ---------------------------------------------------------------------------
CREATE TABLE debt_classifications (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID    NOT NULL REFERENCES loan_contracts(id) ON DELETE CASCADE,
    cic_group       INTEGER NOT NULL CHECK (cic_group BETWEEN 1 AND 5),
    classification  TEXT    NOT NULL,   -- 'Nợ đủ tiêu chuẩn' | 'Nợ cần chú ý' | 'Nợ dưới tiêu chuẩn' | 'Nợ nghi ngờ' | 'Nợ có khả năng mất vốn'
    effective_date  DATE    NOT NULL,
    reported_to_cic BOOLEAN NOT NULL DEFAULT FALSE,
    reported_at     TIMESTAMPTZ
);

COMMENT ON TABLE  debt_classifications            IS 'Monthly CIC debt group classification per TT02/2013 and TT31/2024. Reported to CIC monthly.';
COMMENT ON COLUMN debt_classifications.cic_group  IS '1=Standard; 2=Watch; 3=Sub-standard; 4=Doubtful; 5=Loss.';

CREATE INDEX idx_debt_classification_contract_id   ON debt_classifications(contract_id);
CREATE INDEX idx_debt_classification_unreported    ON debt_classifications(effective_date) WHERE reported_to_cic = FALSE;

-- =============================================================================
-- LAYER 7 — Communication & Audit
-- =============================================================================

CREATE TABLE notifications (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID                    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    application_id  UUID                    REFERENCES loan_applications(id) ON DELETE SET NULL,
    event_type      TEXT                    NOT NULL,
    channel         notification_channel    NOT NULL,
    template_code   TEXT                    NOT NULL,
    content         TEXT,
    status          notification_status     NOT NULL DEFAULT 'QUEUED',
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT now()
);

COMMENT ON TABLE notifications IS 'Push/SMS/email/in-app messages triggered by application lifecycle events.';

CREATE INDEX idx_notifications_customer_id    ON notifications(customer_id);
CREATE INDEX idx_notifications_application_id ON notifications(application_id);
CREATE INDEX idx_notifications_unread         ON notifications(customer_id) WHERE status = 'DELIVERED' AND read_at IS NULL;

-- ---------------------------------------------------------------------------
CREATE TABLE customer_consents (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID            NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    consent_type    consent_type    NOT NULL,
    granted         BOOLEAN         NOT NULL,
    granted_via     TEXT,           -- 'APP_ONBOARDING' | 'APPLICATION_FORM' | 'SETTINGS'
    granted_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ,
    UNIQUE (customer_id, consent_type)
);

COMMENT ON TABLE  customer_consents              IS 'Explicit consent records per type. Required by Nghị định 13/2023/NĐ-CP (data protection).';
COMMENT ON COLUMN customer_consents.consent_type IS 'CIC_INQUIRY consent is mandatory before bureau check.';

CREATE INDEX idx_customer_consents_customer_id ON customer_consents(customer_id);

-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID        REFERENCES loan_applications(id) ON DELETE RESTRICT,
    event_type      TEXT        NOT NULL,
    actor           TEXT        NOT NULL,
    payload         JSONB,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    immutable       BOOLEAN     NOT NULL GENERATED ALWAYS AS (TRUE) STORED
);

COMMENT ON TABLE  audit_log           IS 'Append-only event log. Rows are NEVER updated or deleted (trigger-enforced).';
COMMENT ON COLUMN audit_log.actor     IS 'Customer UUID, system component name, or staff ID for manual operations.';
COMMENT ON COLUMN audit_log.immutable IS 'Always TRUE (generated). Signals append-only semantics to application layer.';

CREATE INDEX idx_audit_log_application_id ON audit_log(application_id);
CREATE INDEX idx_audit_log_event_type     ON audit_log(event_type);
CREATE INDEX idx_audit_log_occurred_at   ON audit_log(occurred_at DESC);

-- Immutable trigger
CREATE OR REPLACE FUNCTION fn_audit_log_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit_log rows are immutable and cannot be modified or deleted.';
END;
$$;

CREATE TRIGGER trg_audit_log_no_update
    BEFORE UPDATE ON audit_log FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable();

CREATE TRIGGER trg_audit_log_no_delete
    BEFORE DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION fn_audit_log_immutable();

-- ---------------------------------------------------------------------------
CREATE TABLE support_tickets (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID            NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    application_id  UUID            REFERENCES loan_applications(id) ON DELETE SET NULL,
    category        ticket_category NOT NULL,
    description     TEXT            NOT NULL,
    status          ticket_status   NOT NULL DEFAULT 'OPEN',
    resolution      TEXT,
    opened_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ,
    CONSTRAINT chk_ticket_resolved CHECK (
        (status IN ('OPEN','IN_PROGRESS') AND resolved_at IS NULL)
        OR (status IN ('RESOLVED','CLOSED') AND resolved_at IS NOT NULL)
    )
);

COMMENT ON TABLE support_tickets IS 'Customer-raised complaints or inquiries via in-app chat or hotline.';

CREATE INDEX idx_support_tickets_customer_id    ON support_tickets(customer_id);
CREATE INDEX idx_support_tickets_application_id ON support_tickets(application_id);
CREATE INDEX idx_support_tickets_open           ON support_tickets(status) WHERE status IN ('OPEN', 'IN_PROGRESS');

-- =============================================================================
-- Updated_at auto-trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_loan_products_updated_at
    BEFORE UPDATE ON loan_products FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_loan_applications_updated_at
    BEFORE UPDATE ON loan_applications FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

COMMIT;
