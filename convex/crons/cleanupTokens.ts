import { cronJobs } from "convex/server";
import { internal } from "../_generated/api";

const crons = cronJobs();

// Run every hour to clean up expired sign-in tokens
crons.interval(
  "cleanup expired sign-in tokens",
  { hours: 1 },
  internal.auth.cleanupExpiredTokens.cleanup
);

export default crons;