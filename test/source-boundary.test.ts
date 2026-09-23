import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authoredFiles = [
  "opencomputer/project.ts",
  "opencomputer/agents/issue-groomer/agent.ts",
  "opencomputer/agents/scope-planner/agent.ts",
  "opencomputer/agents/status-reporter/agent.ts",
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
});

test("the template does not request a Linear credential", () => {
  const template = readFileSync("oc-template.toml", "utf8");
  assert.doesNotMatch(template, /LINEAR_API_KEY/);
  assert.match(template, /\[template\.connections\.linear\]/);
});
