-- ============================================================
--  AUDIT CHAIN — schema reference (Postgres)
-- ============================================================
--  Source of truth for migrations = Alembic
--  (migrations/versions/0001_audit_chain.py).
--  This file is a READABLE SNAPSHOT + a quick psql bootstrap for
--  a throwaway/demo DB. Keep it in sync by hand, or regenerate with:
--      pg_dump --schema-only <db> > src/db/schema.sql
--
--  Apply directly (demo DB, no Alembic):
--      psql "$DATABASE_URL" -f src/db/schema.sql
-- ============================================================

BEGIN;

-- ---------- audit_record : one row per decision -------------
CREATE TABLE IF NOT EXISTS audit_record (
    id              uuid        PRIMARY KEY,
    application_id  text        NOT NULL,
    product         text        NOT NULL,
    lane            integer     NOT NULL,
    outcome         text        NOT NULL,          -- stp_approved | vetoed | hitl
    veto_fired      boolean     NOT NULL DEFAULT false,
    replan_count    integer     NOT NULL DEFAULT 0,
    as_of           date        NOT NULL,          -- breakthrough-B: verdict is tied to this date
    signed_by       text        NOT NULL,          -- 'system' (STP) | human id (HITL)
    decided_at      timestamptz NOT NULL DEFAULT now(),
    content_hash    text        NOT NULL,          -- sha256(this row)
    prev_hash       text                           -- links previous record (tamper-evident)
);
CREATE INDEX IF NOT EXISTS ix_audit_record_application_id
    ON audit_record (application_id);

-- ---------- audit_violation : one row per rule fired --------
CREATE TABLE IF NOT EXISTS audit_violation (
    id              uuid        PRIMARY KEY,
    record_id       uuid        NOT NULL REFERENCES audit_record (id),
    rule_id         text        NOT NULL,
    rule_version    text        NOT NULL,          -- inspector rejects a veto without a version
    effective_from  date        NOT NULL,
    legal_basis     text        NOT NULL,
    metric_name     text        NOT NULL,          -- e.g. dti, ltv
    metric_value    double precision NOT NULL,
    threshold       double precision,
    is_blocking     boolean     NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS ix_audit_violation_record_id
    ON audit_violation (record_id);

-- ---------- immutability : append-only, no rewrite ----------
CREATE OR REPLACE FUNCTION forbid_audit_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit rows are immutable (append-only)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_record_immutable ON audit_record;
CREATE TRIGGER audit_record_immutable
    BEFORE UPDATE OR DELETE ON audit_record
    FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();

DROP TRIGGER IF EXISTS audit_violation_immutable ON audit_violation;
CREATE TRIGGER audit_violation_immutable
    BEFORE UPDATE OR DELETE ON audit_violation
    FOR EACH ROW EXECUTE FUNCTION forbid_audit_mutation();

COMMIT;
