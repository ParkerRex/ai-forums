import { ConvexHttpClient } from "convex/browser";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL env var not set.");
  process.exit(1);
}

async function main() {
  // Read parsed JSON
  const jsonPath = path.join(process.cwd(), "migration-data", "community_members_parsed.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("Parsed members JSON not found. Run transform-community-members.ts first.");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const members = data.members as Array<{
    firstName: string;
    lastName: string;
    email: string;
    joinedDate: number;
    slug: string;
  }>;

  console.log(`🔗 Connecting to Convex at ${CONVEX_URL} ...`);
  const client = new ConvexHttpClient(CONVEX_URL as string);

  let created = 0;
  let updated = 0;

  for (const m of members) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id = await client.mutation("importMembers.js:upsertMember" as any, {
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        joinedDate: m.joinedDate,
      });
      // Currently we cannot tell if created or updated, but we can track by storing seen IDs.
      // Increment created; better would return boolean but OK.
      if (!id) {
        updated++;
      } else {
        created++;
      }
    } catch (err) {
      console.error(`❌ Error upserting member ${m.email}:`, err);
    }
  }

  console.log(`\n✅ Import completed. Created/Updated: ${created + updated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 