import { defineSchedule } from "@opencomputer/agent";

export default defineSchedule({
  id: "prepare-daily-status",
  cron: "9 9 * * 1-5",
  timezone: "UTC",
  enabled: ["production"],
  overlap: "skip",
  dispatch: {
    text: "Prepare today's engineering status report and queue its message intent.",
    payload: { mode: "daily" },
  },
});
