import { defineSchedule } from "@opencomputer/agent";

export default defineSchedule({
  id: "deliver-pending-email",
  cron: "*/2 * * * *",
  timezone: "UTC",
  enabled: ["production"],
  overlap: "skip",
  dispatch: {
    text: "Claim and deliver at most one pending engineering status report.",
    payload: { mode: "queue" },
  },
});
