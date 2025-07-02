#!/usr/bin/env npx tsx

import { ConvexHttpClient } from "convex/browser";

const convexUrl = "https://energized-ibis-736.convex.cloud";
if (!convexUrl) {
  console.error("NEXT_PUBLIC_CONVEX_URL is not set");
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);

async function runMigration() {
  try {
    console.log("Running admin migration...");
    const result = await client.mutation("admin:setInitialAdmin", {});
    console.log("Migration completed:", result);
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

runMigration();