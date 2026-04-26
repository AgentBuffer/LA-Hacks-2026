-- Cognition agents: user-spawned, scheduled content producers tied to a brand.
-- One row per agent. The Agents page renders these.

CREATE TABLE scheduled_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
    slug TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role_line TEXT NOT NULL,
    cadence TEXT NOT NULL,
    avatar_letter TEXT NOT NULL DEFAULT 'A',
    description TEXT,
    owns_channels TEXT[] NOT NULL DEFAULT '{}',
    tools TEXT[] NOT NULL DEFAULT '{}',
    voice_traits TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('running', 'queued', 'paused', 'disabled')),
    health TEXT NOT NULL DEFAULT 'ok'
        CHECK (health IN ('ok', 'warn', 'off')),
    last_latency_ms INT,
    runs_total INT NOT NULL DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, slug)
);

ALTER TABLE scheduled_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON scheduled_agents
    FOR ALL USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

CREATE INDEX idx_scheduled_agents_org ON scheduled_agents(org_id);
CREATE INDEX idx_scheduled_agents_brand ON scheduled_agents(brand_id);
