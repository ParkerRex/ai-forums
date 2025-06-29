import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Define cron jobs for background maintenance
const crons = cronJobs();

// Recalculate member stats nightly at 2 AM UTC
// This keeps cached stats fresh across all members
crons.cron("recalculate member stats", "0 2 * * *", internal.stats.recalcMemberStats, {});

// Merge duplicate members weekly on Sundays at 3 AM UTC  
// This cleans up any duplicate member records that may have been created
crons.cron("merge duplicate members", "0 3 * * 0", internal.migrations.merge_duplicate_members.mergeDuplicateMembers, {
  dryRun: false,
});

export default crons; 