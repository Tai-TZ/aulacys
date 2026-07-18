-- application-svc Postgres schema (Alembic 0001_application is source of truth)
-- docs/APPLICATION-SCHEMA.md §2

BEGIN;

CREATE TABLE IF NOT EXISTS loan_application (
    id             uuid PRIMARY KEY,
    contract_no    text,
    product        text NOT NULL DEFAULT 'retail_unsecured_salary',
    total_amount   numeric(18,0) NOT NULL,
    term_months    integer NOT NULL,
    lending_method text NOT NULL DEFAULT 'per_loan',
    status         text NOT NULL DEFAULT 'submitted',
    created_at     timestamptz NOT NULL DEFAULT now(),
    submitted_at   timestamptz
);

CREATE INDEX IF NOT EXISTS ix_loan_application_status ON loan_application (status);

CREATE TABLE IF NOT EXISTS applicant (
    application_id uuid PRIMARY KEY REFERENCES loan_application(id),
    full_name      text NOT NULL,
    dob            date,
    gender         text,
    id_number      text NOT NULL,
    id_issue_date  date,
    id_issue_place text,
    old_id_number  text,
    email          text
);
CREATE INDEX IF NOT EXISTS ix_applicant_id_number ON applicant (id_number);

CREATE TABLE IF NOT EXISTS applicant_phone (
    application_id uuid PRIMARY KEY REFERENCES loan_application(id),
    mobile_1   text NOT NULL,
    mobile_2   text,
    zalo_phone text
);

CREATE TABLE IF NOT EXISTS applicant_address (
    id             uuid PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES loan_application(id),
    kind           text NOT NULL,
    street         text,
    ward           text,
    district       text,
    province       text,
    same_as_permanent boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS ix_applicant_address_application_id ON applicant_address (application_id);

CREATE TABLE IF NOT EXISTS employment (
    application_id uuid PRIMARY KEY REFERENCES loan_application(id),
    occupation    text,
    employer_name text,
    position      text,
    work_address  text,
    salary_day    text
);

CREATE TABLE IF NOT EXISTS reference_person (
    id             uuid PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES loan_application(id),
    seq            integer NOT NULL,
    full_name      text NOT NULL,
    relationship   text,
    phone          text,
    same_address   boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS ix_reference_person_application_id ON reference_person (application_id);

CREATE TABLE IF NOT EXISTS spouse (
    application_id uuid PRIMARY KEY REFERENCES loan_application(id),
    full_name      text,
    phone          text,
    id_number      text,
    income         numeric(18,0),
    employer_name  text,
    employer_phone text
);

CREATE TABLE IF NOT EXISTS financial_capacity (
    application_id   uuid PRIMARY KEY REFERENCES loan_application(id),
    total_income     numeric(18,0) NOT NULL,
    personal_expense numeric(18,0)
);

CREATE TABLE IF NOT EXISTS consent (
    application_id          uuid PRIMARY KEY REFERENCES loan_application(id),
    data_processing_consent boolean NOT NULL,
    marketing_consent       boolean NOT NULL DEFAULT false,
    consent_version         text,
    consent_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loan_purpose (
    id             uuid PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES loan_application(id),
    category       text NOT NULL,
    amount         numeric(18,0) NOT NULL,
    purpose_detail text,
    prepaid_amount numeric(18,0)
);
CREATE INDEX IF NOT EXISTS ix_loan_purpose_application_id ON loan_purpose (application_id);

CREATE TABLE IF NOT EXISTS purpose_goods (
    id          uuid PRIMARY KEY,
    purpose_id  uuid NOT NULL REFERENCES loan_purpose(id),
    seq         integer NOT NULL,
    name        text,
    brand       text,
    serial_imei text,
    value       numeric(18,0)
);
CREATE INDEX IF NOT EXISTS ix_purpose_goods_purpose_id ON purpose_goods (purpose_id);

CREATE TABLE IF NOT EXISTS disbursement (
    id                uuid PRIMARY KEY,
    application_id    uuid NOT NULL REFERENCES loan_application(id),
    for_category      text,
    method            text NOT NULL,
    bank              text,
    branch            text,
    account_no        text,
    account_name      text,
    beneficiary_name  text,
    beneficiary_tax_id text
);
CREATE INDEX IF NOT EXISTS ix_disbursement_application_id ON disbursement (application_id);

CREATE TABLE IF NOT EXISTS sales_info (
    application_id uuid PRIMARY KEY REFERENCES loan_application(id),
    dsa_code       text,
    witness_phone  text,
    branch_pos_hub text
);

CREATE TABLE IF NOT EXISTS application_document (
    id             uuid PRIMARY KEY,
    application_id uuid NOT NULL REFERENCES loan_application(id),
    doc_type       text NOT NULL,
    title          text,
    status         text NOT NULL DEFAULT 'missing',
    required_for   text,
    storage_uri    text,
    tier           integer,
    confirmed_by   text,
    uploaded_at    timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_application_document_application_id ON application_document (application_id);
CREATE INDEX IF NOT EXISTS ix_application_document_doc_type ON application_document (doc_type);

COMMIT;
