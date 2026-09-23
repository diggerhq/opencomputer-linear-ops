# Linear engineering operations agents

This OpenComputer template installs four independently scheduled agents that
coordinate through one managed database:

- **Issue groomer** incrementally reads Linear, stores issue snapshots,
  produces concise issue analyses, and queues technical scoping work.
- **Scope planner** claims queued work, inspects an attached GitHub repository,
  and stores an evidence-backed implementation plan.
- **Status reporter** reads shared state, creates a daily engineering brief,
  and writes a channel-neutral pending message record.
- **Report delivery** claims one pending message at a time and sends it through
  a constrained AgentMail connection with an idempotency key.

The proof intentionally does not depend on Slack and never mutates Linear or
GitHub. AgentMail is a replaceable delivery adapter behind the `message_jobs`
contract.

## Verify locally

```bash
npm install
npm test
npm run typecheck
npm run doctor
npm run template:build
```

The test suite applies the checked-in migration to a fresh SQLite database and
proves revision uniqueness, scope-job lease recovery, report deduplication, and
pending message creation.

## Configure Development

Install the template or link a fresh project, connect Linear, then provide the
runtime configuration:

```bash
opencomputer connection add linear
```

- `LINEAR_TEAM_ID`: the selected Linear team UUID;
- `GITHUB_REPOSITORY`: an optional `owner/repository` selected in the attached
  OpenComputer GitHub App installation;
- `REPORT_DESTINATION_KEY`: an operational name such as `engineering-triage`;
- `REPORT_TIMEZONE`, `STALE_AFTER_DAYS`, and `RECENTLY_COMPLETED_DAYS`.

Delivery destinations are data, not runtime code or deployment variables.
Configure one after deployment by sending the report-delivery agent an explicit
administrative request:

```bash
opencomputer session \
  "Configure destination=engineering-triage provider=agentmail inbox=engineering-status@agentmail.to recipient=engineering@example.com" \
  --agent <project-agent>--report-delivery
```

This upserts one `delivery_destinations` row and sends no email. Pending
`message_jobs` select that record through their `destination_key`.

Upload the AgentMail credential as a write-only Development secret:

```bash
printf %s "$AGENTMAIL_API_KEY" | opencomputer secrets set AGENTMAIL_API_KEY --value-stdin --environment development --agent <project-agent>--report-delivery
```

The delivery tool can only POST to AgentMail's inbox send endpoint. The API key
never enters the model; inbox and recipient must come from the enabled database
record matching the claimed job. Retries reuse the message job ID as
AgentMail's `Idempotency-Key`, preventing duplicate sends within the provider's
idempotency window.

The issue groomer declares `useService("linear")` and sends GraphQL requests
through the connected service. Linear credentials remain in OpenComputer's
connection broker and never enter the agent runtime, prompts, or database.

Connect GitHub only if code-informed scoping is required. The declared
connection requests read-only repository contents and metadata.

## Development proof

All recurring schedules are Production-only, so Development shows them as
manual. Run them in order:

1. `sync-and-groom` on `issue-groomer`;
2. `plan-pending-scope` on `scope-planner`; and
3. `prepare-daily-status` on `status-reporter`; and
4. after reviewing the pending email, `deliver-pending-email` on
   `report-delivery`.

Then inspect the project database. A successful proof has current
`issue_snapshots`, revision-keyed `issue_analyses`, zero or more `scope_plans`,
one immutable `reports` row, and one `message_jobs` row whose status moves from
`pending` to `delivered` with a provider message ID. Running the same inputs
again must not duplicate any of them or send a second email.

Do not promote to Production until the Development proof has been reviewed.

For a credential-free platform smoke test, send each agent a prompt containing
`fixture`. The groomer inserts deterministic Linear-like evidence without
calling Linear, the scope planner produces an explicitly labeled fixture plan
without calling GitHub, and the reporter creates a fixture report plus pending
message job. Fixture mode proves session/database coordination, not provider
integration.
