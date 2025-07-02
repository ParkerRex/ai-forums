#!/usr/bin/env npx tsx
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";

async function runMigration() {
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!convexUrl) {
    console.error("Error: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable is not set");
    process.exit(1);
  }

  const client = new ConvexClient(convexUrl);

  try {
    console.log("Starting post attachments migration...");
    
    // Run the main migration
    const result = await client.mutation(api.migrations.migrate_post_attachments.migratePostAttachments, {
      batchSize: 100,
    });
    
    console.log(`Main migration completed. Processed ${result.processedCount} posts with media.`);
    
    // Run the link image migration
    const linkResult = await client.mutation(api.migrations.migrate_post_attachments.migrateLinkedPostAttachments, {
      batchSize: 100,
    });
    
    console.log(`Link migration completed. Processed ${linkResult.processedCount} posts with link images.`);
    
    console.log("All migrations completed successfully!");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});