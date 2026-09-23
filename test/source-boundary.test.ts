import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authoredFiles = [
  "opencomputer/project.ts",
  "opencomputer/agents/issue-groomer/agent.ts",
  "opencomputer/agents/scope-planner/agent.ts",
  "opencomputer/agents/status-reporter/agent.ts",
  "opencomputer/agents/report-delivery/agent.ts",
].map((path) => readFileSync(path, "utf8"));

test("the proof has no code-defined channel or outbox resources", () => {
  const source = authoredFiles.join("\n");
  for (const forbidden of [
    "defineChannel",
    "registerChannel",
    "defineOutbox",
    "registerOutbox",
    "publishOutbox",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test("only the groomer declares Linear and only the planner declares GitHub", () => {
  assert.match(authoredFiles[1]!, /useService\("linear"\)/);
  assert.doesNotMatch(authoredFiles[2]!, /useService\("linear"\)/);
  assert.doesNotMatch(authoredFiles[3]!, /useService\("linear"\)/);
  assert.doesNotMatch(authoredFiles[4]!, /useService\("linear"\)/);

  const linearTool = readFileSync(
    "opencomputer/agents/issue-groomer/tools/linear.ts",
    "utf8",
  );
  assert.match(linearTool, /callService\(/);
  assert.match(linearTool, /service:\s*"linear"/);
  assert.match(linearTool, /path:\s*"\/graphql"/);

  assert.match(
    linearTool,
    /api\.linear\.app/,
  );
  assert.doesNotMatch(authoredFiles[2]!, /api\.linear\.app/);
  assert.doesNotMatch(authoredFiles[3]!, /api\.linear\.app/);
  assert.match(authoredFiles[2]!, /githubApp/);
  assert.doesNotMatch(authoredFiles[1]!, /githubApp/);
  assert.doesNotMatch(authoredFiles[3]!, /githubApp/);
  assert.doesNotMatch(authoredFiles[4]!, /githubApp/);
});

test("the template does not request a Linear credential", () => {
  const template = readFileSync("oc-template.toml", "utf8");
  assert.doesNotMatch(template, /LINEAR_API_KEY/);
  assert.match(template, /\[template\.connections\.linear\]/);
});

test("fixture mode requires an explicit fixture request", () => {
  for (const source of authoredFiles.slice(1)) {
    assert.doesNotMatch(source, /includes\(["']fixture["']\)/);
  }
});

test("the Linear update cursor accepts timestamps and relative durations", () => {
  const linearTool = readFileSync(
    "opencomputer/agents/issue-groomer/tools/linear.ts",
    "utf8",
  );
  assert.match(linearTool, /updatedAfter:\s*\{[^}]*minLength:\s*3/);
  assert.match(linearTool, /\$updatedAfter:\s*DateTimeOrDuration!/);
  assert.doesNotMatch(linearTool, /\$updatedAfter:\s*DateTime!/);
});

test("the groomer can auto-select one connected Linear team", () => {
  assert.match(authoredFiles[1]!, /If exactly one team is\s+available, use it/);
  assert.match(authoredFiles[1]!, /If none or multiple teams are available/);
});

test("the reporter accepts an explicit destination fallback and rejects inferred plans", () => {
  assert.match(authoredFiles[3]!, /destination\(\?:_key\)\?/);
  assert.match(authoredFiles[3]!, /paths were inferred rather than observed/);
});

test("the delivery agent uses a constrained AgentMail connection", () => {
  const deliveryTool = readFileSync(
    "opencomputer/agents/report-delivery/tools/agentmail.ts",
    "utf8",
  );
  assert.match(authoredFiles[0]!, /"report-delivery"/);
  assert.match(authoredFiles[4]!, /useConnection\(agentMail\)/);
  assert.match(deliveryTool, /origin:\s*"https:\/\/api\.agentmail\.to"/);
  assert.match(deliveryTool, /methods:\s*\["POST"\]/);
  assert.match(deliveryTool, /pathPrefix:\s*"\/v0\/inboxes\/"/);
  assert.match(deliveryTool, /useSecret\("AGENTMAIL_API_KEY"\)/);
  assert.match(deliveryTool, /"Idempotency-Key": idempotencyKey/);
  assert.match(
    deliveryTool,
    /requiredRuntimeVariable\("DELIVERY_RECIPIENT_EMAIL"\)/,
  );
});
