import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Define cron jobs for background maintenance
const crons = cronJobs();

// Recalculate member stats nightly at 2 AM UTC
// This keeps cached stats fresh across all members
crons.cron("recalculate member stats", "0 2 * * *", internal.stats.recalcMemberStats, {});

// Check for upcoming subscription renewals daily at 10 AM UTC
// Sends reminder notifications at 7 days, 3 days, and 1 day before renewal
crons.cron(
  "subscription renewal reminders",
  "0 10 * * *",
  internal.stripe.renewalReminders.checkAndSendReminders,
  {},
);

// Process Discord digest daily at 6 AM UTC
// Collects, processes, and stores yesterday's Discord messages for the daily digest
crons.cron("process discord digest", "0 6 * * *", internal.discord.processDiscordDigest, {
  targetDate: (() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  })(),
});

// Clean up expired auth sessions hourly
// Removes sessions where expiresAt < current time
crons.interval("cleanup expired sessions", { hours: 1 }, internal.auth.cleanupExpiredSessions, {});

// Clean up expired auth tokens daily at 3 AM UTC
// Removes expired email verifications and password reset tokens
crons.cron("cleanup expired tokens", "0 3 * * *", internal.auth.cleanupExpiredTokens, {});

// Clean up old password history daily at 4 AM UTC
// Keeps only the last 3 passwords per member
crons.cron("cleanup password history", "0 4 * * *", internal.auth.cleanupPasswordHistory, {});

export default crons;
