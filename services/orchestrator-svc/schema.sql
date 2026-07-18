CREATE TABLE IF NOT EXISTS orchestrator_run (
    run_id          uuid PRIMARY KEY,
    request_id      text NOT NULL,
    application_id  text NOT NULL,
    product         text NOT NULL,
    status          text NOT NULL,
    lane            integer,
    outcome         text,
    veto_fired      boolean NOT NULL DEFAULT false,
    replan_count    integer NOT NULL DEFAULT 0,
    state_snapshot  jsonb NOT NULL DEFAULT '{}'::jsonb,
    started_at      timestamptz NOT NULL DEFAULT now(),
    finished_at     timestamptz
);

CREATE INDEX IF NOT EXISTS ix_orchestrator_run_application_id
    ON orchestrator_run (application_id);
CREATE INDEX IF NOT EXISTS ix_orchestrator_run_status
    ON orchestrator_run (status);

CREATE TABLE IF NOT EXISTS orchestrator_node_run (
    id          uuid PRIMARY KEY,
    run_id      uuid NOT NULL REFERENCES orchestrator_run(run_id),
    node        text NOT NULL,
    attempt     integer NOT NULL DEFAULT 1,
    status      text NOT NULL,
    latency_ms  integer,
    tool_calls  jsonb NOT NULL DEFAULT '[]'::jsonb,
    output_ref  jsonb NOT NULL DEFAULT '{}'::jsonb,
    started_at  timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS ix_orchestrator_node_run_run_id
    ON orchestrator_node_run (run_id);
CREATE INDEX IF NOT EXISTS ix_orchestrator_node_run_node
    ON orchestrator_node_run (node);

CREATE TABLE IF NOT EXISTS orchestrator_event (
    id          uuid PRIMARY KEY,
    run_id      uuid NOT NULL REFERENCES orchestrator_run(run_id),
    seq         integer NOT NULL,
    event_type  text NOT NULL,
    payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (run_id, seq)
);

CREATE INDEX IF NOT EXISTS ix_orchestrator_event_run_id
    ON orchestrator_event (run_id);
