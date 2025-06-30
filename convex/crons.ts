import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Define cron jobs for background maintenance
const crons = cronJobs();

// Recalculate member stats nightly at 2 AM UTC
// This keeps cached stats fresh across all members
crons.cron("recalculate member stats", "0 2 * * *", internal.stats.recalcMemberStats, {});



export default crons; 