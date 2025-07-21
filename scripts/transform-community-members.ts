import fs from "fs";
import path from "path";
import * as csv from "csv-parse/sync";
import { generateMemberSlug } from "../lib/slug-utils";

interface RawCsvRow {
  FirstName: string;
  LastName: string;
  Email: string;
  "Invited By"?: string;
  JoinedDate: string;
  // Remaining question/answer columns are ignored
}

interface NormalizedMember {
  firstName: string;
  lastName: string;
  email: string;
  joinedDate: number; // Unix timestamp (ms)
  updatedAt: number;
  status: "active";
  slug: string;
}

function parseDateToUnix(dateStr: string): number {
  // CSV uses "YYYY-MM-DD HH:MM:SS" in UTC (?)
  const date = new Date(dateStr + "Z"); // Append Z to ensure UTC parsing.
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  return date.getTime();
}

async function main() {
  const csvPath = path.join(process.cwd(), "migration-data", "community_members (6).csv");
  const rawCsv = fs.readFileSync(csvPath, "utf-8");

  const records: RawCsvRow[] = csv.parse(rawCsv, {
    columns: true,
    skip_empty_lines: true,
  });

  const normalized: NormalizedMember[] = records.map((row) => {
    const firstName = row.FirstName.trim();
    const lastName = row.LastName.trim();
    const email = row.Email.trim().toLowerCase();
    const joinedDate = parseDateToUnix(row.JoinedDate.trim());

    const baseSlug = generateMemberSlug(`${firstName} ${lastName}`);

    return {
      firstName,
      lastName,
      email,
      joinedDate,
      updatedAt: joinedDate,
      status: "active",
      slug: baseSlug, // Will be deduped during import
    };
  });

  const outputPath = path.join(process.cwd(), "migration-data", "community_members_parsed.json");
  fs.writeFileSync(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: normalized.length,
    members: normalized,
  }, null, 2));

  console.log(`✅ Parsed ${normalized.length} members.`);
  console.log(`📁 Output written to ${outputPath}`);
}

main().catch((err) => {
  console.error("Error transforming community members:", err);
  process.exit(1);
}); 