-- audit-svc Postgres schema snapshot (source of truth = Alembic 0001_audit).
-- Apply: psql "$DATABASE_URL" -f schema.sql   (demo only; prefer alembic upgrade)

BEGIN;

CREATE TABLE IF NOT EXISTS audit_record (
    id              uuid PRIMARY KEY,
    application_id  text NOT NULL,
    product         text NOT NULL,
    lane            integer NOT NULL,
    outcome         text NOT NULL,
    veto_fired      boolean NOT NULL DEFAULT false,
    replan_count    integer NOT NULL DEFAULT 0,
    as_of           date NOT NULL,
    signed_by       text NOT NULL,
    decided_at      text NOT NULL,
    decided_at_ts   timestamptz,
    seq             integer NOT NULL,
    content_hash    text NOT NULL,
    prev_hash       text
);
CREATE INDEX IF NOT EXISTS ix_audit_record_application_id ON audit_record (application_id);
CREATE INDEX IF NOT EXISTS ix_audit_record_seq ON audit_record (seq);

CREATE TABLE IF NOT EXISTS audit_violation (
    id              uuid PRIMARY KEY,
    record_id       uuid NOT NULL REFERENCES audit_record (id),
    rule_id         text NOT NULL,
    rule_version    text NOT NULL,
    effective_from  date NOT NULL,
    legal_basis     text NOT NULL,
    metric_name     text NOT NULL,
    metric_value    double precision NOT NULL,
    threshold       double precision,
    is_blocking     boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS ix_audit_violation_record_id ON audit_violation (record_id);

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
