import { cronJobs } from "convex/server";
import { internal } from "../_generated/api";

const crons = cronJobs();

// Run every 5 minutes to process posts without previews
crons.interval(
  "generateMissingPreviews",
  { minutes: 5 },
  internal.previewGeneration.processMissingPreviews,
  { batchSize: 5 },
);

export default crons;
