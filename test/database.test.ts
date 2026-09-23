import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const migrationDirectory = "opencomputer/database/migrations";

function migratedDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const name of readdirSync(migrationDirectory).sort()) {
    if (!name.endsWith(".sql")) continue;
    const migration = readFileSync(`${migrationDirectory}/${name}`, "utf8");
    for (const statement of migration.split(/\n\s*-- migrate:split\s*\n/g)) {
      if (statement.trim()) database.exec(statement);
    }
  }
  return database;
}

function seedIssue(database: DatabaseSync): void {
  database
    .prepare(
      `INSERT INTO linear_sync_runs
       (id, team_id, started_at, completed_at, status, issue_count)
       VALUES (?, ?, ?, ?, 'succeeded', 1)`,
    )
    .run("sync-1", "team-1", "2026-09-22T15:00:00Z", "2026-09-22T15:00:10Z");
  database
    .prepare(
      `INSERT INTO issue_snapshots
       (issue_id, identifier, team_id, team_key, title, description, state_id,
        state_name, state_type, priority, labels_json, url, created_at,
        updated_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "issue-1",
      "ENG-1",
      "team-1",
      "ENG",
      "CSV export broken",
      "Names containing commas fail.",
      "state-1",
      "Todo",
      "unstarted",
      2,
      "[]",
      "https://linear.app/acme/issue/ENG-1",
      "2026-09-22T14:00:00Z",
      "2026-09-22T14:30:00Z",
      "2026-09-22T15:00:10Z",
    );
}

test("migration creates the coordination schema", () => {
  const database = migratedDatabase();
  const tables = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all()
    .map((row) => String(row.name));
  assert.deepEqual(tables, [
    "delivery_destinations",
    "issue_analyses",
    "issue_snapshots",
    "linear_sync_runs",
    "message_jobs",
    "reports",
    "scope_jobs",
    "scope_plans",
    "sync_checkpoints",
    "team_repositories",
  ]);
});

test("delivery destinations are database-defined and keyed independently", () => {
  const database = migratedDatabase();
  database
    .prepare(
      `INSERT INTO delivery_destinations
       (destination_key, provider, inbox_id, recipient_email, enabled,
        created_at, updated_at)
       VALUES (?, 'agentmail', ?, ?, 1, ?, ?)`,
    )
    .run(
      "engineering-status",
      "reporter-agent@agentmail.to",
      "engineering@example.com",
      "2026-09-23T17:00:00Z",
      "2026-09-23T17:00:00Z",
    );
  const stored = database
    .prepare(
      `SELECT provider, inbox_id, recipient_email, enabled
       FROM delivery_destinations WHERE destination_key = ?`,
    )
    .get("engineering-status");
  assert.deepEqual({ ...stored }, {
    provider: "agentmail",
    inbox_id: "reporter-agent@agentmail.to",
    recipient_email: "engineering@example.com",
    enabled: 1,
  });
});

test("one issue revision produces one analysis and scope job", () => {
  const database = migratedDatabase();
  seedIssue(database);
  const insertAnalysis = database.prepare(
    `INSERT INTO issue_analyses
     (id, issue_id, issue_updated_at, proposed_title, problem_statement,
      acceptance_criteria_json, missing_questions_json,
      duplicate_candidates_json, needs_scope, evidence_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertAnalysis.run(
    "analysis:issue-1:2026-09-22T14:30:00Z",
    "issue-1",
    "2026-09-22T14:30:00Z",
    "Handle quoted CSV fields",
    "CSV export fails for names containing delimiters.",
    '["Comma-containing names export correctly"]',
    "[]",
    "[]",
    1,
    '["ENG-1"]',
    "2026-09-22T15:01:00Z",
  );
  assert.throws(() =>
    insertAnalysis.run(
      "analysis-duplicate",
      "issue-1",
      "2026-09-22T14:30:00Z",
      "Duplicate",
      "Duplicate",
      "[]",
      "[]",
      "[]",
      1,
      "[]",
      "2026-09-22T15:02:00Z",
    ),
  );

  const insertJob = database.prepare(
    `INSERT INTO scope_jobs
     (id, issue_id, issue_updated_at, status, reason, attempts, created_at,
      updated_at)
     VALUES (?, ?, ?, 'pending', ?, 0, ?, ?)`,
  );
  insertJob.run(
    "scope:issue-1:2026-09-22T14:30:00Z",
    "issue-1",
    "2026-09-22T14:30:00Z",
    "Repository inspection would identify the serializer.",
    "2026-09-22T15:01:00Z",
    "2026-09-22T15:01:00Z",
  );
  assert.throws(() =>
    insertJob.run(
      "scope-duplicate",
      "issue-1",
      "2026-09-22T14:30:00Z",
      "Duplicate",
      "2026-09-22T15:02:00Z",
      "2026-09-22T15:02:00Z",
    ),
  );
});

test("expired scope leases are recoverable and active leases are fenced", () => {
  const database = migratedDatabase();
  seedIssue(database);
  database
    .prepare(
      `INSERT INTO scope_jobs
       (id, issue_id, issue_updated_at, status, reason, lease_owner,
        lease_until, attempts, created_at, updated_at)
       VALUES (?, ?, ?, 'running', ?, ?, ?, 1, ?, ?)`,
    )
    .run(
      "scope-1",
      "issue-1",
      "2026-09-22T14:30:00Z",
      "Needs code evidence",
      "old-worker",
      "2026-09-22T15:00:00Z",
      "2026-09-22T14:59:00Z",
      "2026-09-22T14:59:00Z",
    );

  const claim = database.prepare(
    `UPDATE scope_jobs
     SET status = 'running', lease_owner = ?, lease_until = ?,
         attempts = attempts + 1, updated_at = ?
     WHERE id = ?
       AND (status = 'pending' OR (status = 'running' AND lease_until < ?))`,
  );
  const recovered = claim.run(
    "new-worker",
    "2026-09-22T15:20:00Z",
    "2026-09-22T15:05:00Z",
    "scope-1",
    "2026-09-22T15:05:00Z",
  );
  assert.equal(recovered.changes, 1);
  const fenced = claim.run(
    "other-worker",
    "2026-09-22T15:21:00Z",
    "2026-09-22T15:06:00Z",
    "scope-1",
    "2026-09-22T15:06:00Z",
  );
  assert.equal(fenced.changes, 0);
});

test("a report creates one pending message and no delivery attempt", () => {
  const database = migratedDatabase();
  seedIssue(database);
  const report = database.prepare(
    `INSERT INTO reports
     (id, report_key, period_start, period_end, timezone, content,
      source_sync_id, content_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  report.run(
    "report-1",
    "2026-09-22:team-1:sync-1",
    "2026-09-21T16:00:00Z",
    "2026-09-22T16:00:00Z",
    "America/Los_Angeles",
    "Engineering status",
    "sync-1",
    "hash-1",
    "2026-09-22T16:00:00Z",
  );
  const message = database.prepare(
    `INSERT INTO message_jobs
     (id, dedupe_key, kind, destination_key, payload_json, status,
      available_at, attempts, created_at, updated_at)
     VALUES (?, ?, 'engineering.status', ?, ?, 'pending', ?, 0, ?, ?)`,
  );
  message.run(
    "message-1",
    "engineering.status:2026-09-22:team-1:sync-1",
    "engineering-triage",
    '{"reportId":"report-1","text":"Engineering status"}',
    "2026-09-22T16:00:00Z",
    "2026-09-22T16:00:00Z",
    "2026-09-22T16:00:00Z",
  );
  assert.throws(() =>
    message.run(
      "message-2",
      "engineering.status:2026-09-22:team-1:sync-1",
      "engineering-triage",
      '{"reportId":"report-1","text":"Duplicate"}',
      "2026-09-22T16:01:00Z",
      "2026-09-22T16:01:00Z",
      "2026-09-22T16:01:00Z",
    ),
  );
  const stored = database
    .prepare(
      `SELECT status, attempts, provider_message_id, delivered_at
       FROM message_jobs WHERE id = ?`,
    )
    .get("message-1");
  assert.deepEqual({ ...stored }, {
    status: "pending",
    attempts: 0,
    provider_message_id: null,
    delivered_at: null,
  });
});
