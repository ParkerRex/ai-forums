import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Define cron jobs for background maintenance
const crons = cronJobs();

// Recalculate member stats nightly at 2 AM UTC
// This keeps cached stats fresh across all members
crons.cron("recalculate member stats", "0 2 * * *", internal.stats.recalcMemberStats, {});

// Check for upcoming subscription renewals daily at 10 AM UTC
// Sends reminder notifications at 7 days, 3 days, and 1 day before renewal
crons.cron("subscription renewal reminders", "0 10 * * *", internal.stripe.renewalReminders.checkAndSendReminders, {});



export default crons; 