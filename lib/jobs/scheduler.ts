import cron from "node-cron";
import { cleanupExpiredSessions } from "./workers/cleanup";
import { recalculateMemberStats } from "./workers/member-stats";

let initialized = false;

export function initScheduler() {
  if (initialized) {
    console.log("Scheduler already initialized");
    return;
  }

  // Recalculate member stats at 2 AM UTC daily
  cron.schedule("0 2 * * *", async () => {
    console.log("Running member stats recalculation...");
    try {
      await recalculateMemberStats();
      console.log("Member stats recalculation complete");
    } catch (error) {
      console.error("Member stats recalculation failed:", error);
    }
  });

  // Cleanup expired sessions every hour
  cron.schedule("0 * * * *", async () => {
    console.log("Running session cleanup...");
    try {
      const count = await cleanupExpiredSessions();
      console.log(`Session cleanup complete: ${count} sessions removed`);
    } catch (error) {
      console.error("Session cleanup failed:", error);
    }
  });

  initialized = true;
  console.log("Job scheduler initialized");
}
