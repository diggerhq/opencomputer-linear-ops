CREATE TABLE linear_sync_runs (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  issue_count INTEGER NOT NULL DEFAULT 0 CHECK (issue_count >= 0),
  error TEXT
);

-- migrate:split

CREATE INDEX linear_sync_runs_team_time
  ON linear_sync_runs(team_id, started_at DESC);

-- migrate:split

CREATE TABLE sync_checkpoints (
  source TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  cursor_time TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (source, scope_id)
);

-- migrate:split

CREATE TABLE issue_snapshots (
  issue_id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL UNIQUE,
  team_id TEXT NOT NULL,
  team_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  state_id TEXT NOT NULL,
  state_name TEXT NOT NULL,
  state_type TEXT NOT NULL,
  priority INTEGER NOT NULL,
  assignee_id TEXT,
  assignee_name TEXT,
  labels_json TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  canceled_at TEXT,
  synced_at TEXT NOT NULL
);

-- migrate:split

CREATE INDEX issue_snapshots_team_state
  ON issue_snapshots(team_id, state_type, updated_at DESC);

-- migrate:split

CREATE TABLE issue_analyses (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issue_snapshots(issue_id),
  issue_updated_at TEXT NOT NULL,
  proposed_title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  acceptance_criteria_json TEXT NOT NULL,
  missing_questions_json TEXT NOT NULL,
  duplicate_candidates_json TEXT NOT NULL,
  needs_scope INTEGER NOT NULL CHECK (needs_scope IN (0, 1)),
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (issue_id, issue_updated_at)
);

-- migrate:split

CREATE TABLE scope_jobs (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL REFERENCES issue_snapshots(issue_id),
  issue_updated_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'running', 'complete', 'failed', 'superseded')
  ),
  reason TEXT NOT NULL,
  lease_owner TEXT,
  lease_until TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_error TEXT,
  UNIQUE (issue_id, issue_updated_at)
);

-- migrate:split

CREATE INDEX scope_jobs_claimable
  ON scope_jobs(status, lease_until, created_at);

-- migrate:split

CREATE TABLE scope_plans (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES scope_jobs(id),
  issue_id TEXT NOT NULL REFERENCES issue_snapshots(issue_id),
  issue_updated_at TEXT NOT NULL,
  repository TEXT NOT NULL,
  components_json TEXT NOT NULL,
  files_json TEXT NOT NULL,
  implementation_steps_json TEXT NOT NULL,
  tests_json TEXT NOT NULL,
  risks_json TEXT NOT NULL,
  questions_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (issue_id, issue_updated_at)
);

-- migrate:split

CREATE TABLE team_repositories (
  team_id TEXT PRIMARY KEY,
  repository TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- migrate:split

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  report_key TEXT NOT NULL UNIQUE,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  timezone TEXT NOT NULL,
  content TEXT NOT NULL,
  source_sync_id TEXT NOT NULL REFERENCES linear_sync_runs(id),
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- migrate:split

CREATE TABLE message_jobs (
  id TEXT PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  destination_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'running', 'delivered', 'failed')
  ),
  available_at TEXT NOT NULL,
  lease_owner TEXT,
  lease_until TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  provider_message_id TEXT,
  delivered_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- migrate:split

CREATE INDEX message_jobs_claimable
  ON message_jobs(status, available_at, lease_until);
