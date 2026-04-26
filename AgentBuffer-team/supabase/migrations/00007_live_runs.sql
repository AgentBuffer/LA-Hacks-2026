-- Live runs: one row per execution of a scheduled agent (or one-off).
-- Groups agent_messages into a run for the Live screen's stream view.

CREATE TABLE live_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    scheduled_agent_id UUID REFERENCES scheduled_agents(id) ON DELETE SET NULL,
    slot_id UUID REFERENCES content_slots(id) ON DELETE SET NULL,
    run_number INT NOT NULL,
    channel TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    tokens_used INT,
    cost_estimate_cents INT,
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'approved', 'rejected', 'published', 'failed'))
);

ALTER TABLE live_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON live_runs
    FOR ALL USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

CREATE INDEX idx_live_runs_org_started ON live_runs(org_id, started_at DESC);
CREATE INDEX idx_live_runs_scheduled_agent ON live_runs(scheduled_agent_id);

-- Add run grouping + structured event fields to existing agent_messages.
-- Existing rows get NULL run_id; new rows from the seed action will set it.
ALTER TABLE agent_messages
    ADD COLUMN run_id UUID REFERENCES live_runs(id) ON DELETE CASCADE,
    ADD COLUMN event_kind TEXT
        CHECK (event_kind IN ('proposal', 'critique', 'verdict', 'revision', 'publish', 'note')),
    ADD COLUMN title TEXT,
    ADD COLUMN body TEXT,
    ADD COLUMN quote TEXT,
    ADD COLUMN verdict_label TEXT
        CHECK (verdict_label IN ('approved', 'rejected', NULL)),
    ADD COLUMN verdict_score NUMERIC(3, 1),
    ADD COLUMN sequence_number INT;

CREATE INDEX idx_agent_messages_run ON agent_messages(run_id, sequence_number);
