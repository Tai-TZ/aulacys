-- los-svc Postgres schema (Alembic 0001_los is source of truth)

BEGIN;

CREATE TABLE IF NOT EXISTS loan_ticket (
    ticket_id      text PRIMARY KEY,
    application_id text NOT NULL,
    status         text NOT NULL,
    product        text,
    summary        text NOT NULL,
    assigned_to    text,
    created_at     timestamptz NOT NULL,
    updated_at     timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_loan_ticket_application_id ON loan_ticket (application_id);
CREATE INDEX IF NOT EXISTS ix_loan_ticket_status ON loan_ticket (status);

CREATE TABLE IF NOT EXISTS ticket_history (
    id           uuid PRIMARY KEY,
    ticket_id    text NOT NULL REFERENCES loan_ticket (ticket_id),
    old_status   text,
    new_status   text NOT NULL,
    changed_at   timestamptz NOT NULL,
    changed_by   text
);
CREATE INDEX IF NOT EXISTS ix_ticket_history_ticket_id ON ticket_history (ticket_id);

COMMIT;
