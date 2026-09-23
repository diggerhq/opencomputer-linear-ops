import { defineSchedule } from "@opencomputer/agent";

export default defineSchedule({
  id: "plan-pending-scope",
  cron: "*/5 * * * *",
  timezone: "UTC",
  enabled: ["production"],
  overlap: "skip",
  dispatch: {
    text: "Claim and plan at most one pending technical scope job.",
    payload: { mode: "queue" },
  },
});
