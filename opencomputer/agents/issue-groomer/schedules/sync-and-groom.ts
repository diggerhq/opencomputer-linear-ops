import { defineSchedule } from "@opencomputer/agent";

export default defineSchedule({
  id: "sync-and-groom",
  cron: "*/5 * * * *",
  timezone: "UTC",
  enabled: ["production"],
  overlap: "skip",
  dispatch: {
    text: "Synchronize recently changed Linear issues and groom new revisions.",
    payload: { mode: "incremental" },
  },
});
