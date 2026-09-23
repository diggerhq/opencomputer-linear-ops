import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeLinearIssue,
  normalizeLinearTeam,
} from "../opencomputer/agents/issue-groomer/tools/linear.js";

test("normalizes a Linear team for setup discovery", () => {
  assert.deepEqual(
    normalizeLinearTeam({ id: "team-1", key: "ENG", name: "Engineering" }),
    { id: "team-1", key: "ENG", name: "Engineering" },
  );
});

test("normalizes the bounded Linear issue shape", () => {
  assert.deepEqual(
    normalizeLinearIssue({
      id: "issue-1",
      identifier: "ENG-1",
      title: "CSV export broken",
      description: "Names containing commas fail.",
      priority: 2,
      url: "https://linear.app/acme/issue/ENG-1",
      createdAt: "2026-09-22T14:00:00Z",
      updatedAt: "2026-09-22T14:30:00Z",
      completedAt: null,
      canceledAt: null,
      team: { id: "team-1", key: "ENG", name: "Engineering" },
      state: { id: "state-1", name: "Todo", type: "unstarted" },
      assignee: { id: "user-1", name: "Ramin" },
      labels: { nodes: [{ id: "label-1", name: "bug" }] },
    }),
    {
      id: "issue-1",
      identifier: "ENG-1",
      title: "CSV export broken",
      description: "Names containing commas fail.",
      priority: 2,
      url: "https://linear.app/acme/issue/ENG-1",
      createdAt: "2026-09-22T14:00:00Z",
      updatedAt: "2026-09-22T14:30:00Z",
      completedAt: null,
      canceledAt: null,
      team: { id: "team-1", key: "ENG", name: "Engineering" },
      state: { id: "state-1", name: "Todo", type: "unstarted" },
      assignee: { id: "user-1", name: "Ramin" },
      labels: [{ id: "label-1", name: "bug" }],
    },
  );
});

test("rejects incomplete Linear responses instead of inventing fields", () => {
  assert.throws(
    () => normalizeLinearIssue({ id: "issue-1" }),
    /issue\.identifier/,
  );
});
