const { ConvexHttpClient } = require("convex/browser");
const fs = require("fs");
const path = require("path");

/**
 * Complete Member Import Script
 * 
 * This script:
 * 1. Transforms CSV member data to match the Convex schema
 * 2. Imports the data directly to Convex in batches
 * 
 * Usage:
 * 1. Place your CSV file as 'members.json' in the project root
 * 2. Run: node scripts/import-members.js
 * 
 * CSV Format Expected:
 * FirstName,LastName,Email,Invited By,JoinedDate,Question1,Answer1,Question2,Answer2,Question3,Answer3
 */

// Configuration
const csvFilePath = path.join(__dirname, "../members.json");
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://energized-ibis-736.convex.cloud";
const BATCH_SIZE = 10;

// Parse CSV
function parseCSV(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",");
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : "";
    });
    data.push(row);
  }

  return data;
}

// Transform data to match schema
function transformMembers(csvData) {
  const currentTimestamp = Date.now(); // milliseconds since epoch

  return csvData.map((row) => {
    // Parse the joinedDate from CSV format "2025-06-23 04:01:58"
    let joinedTimestamp = currentTimestamp;
    if (row.JoinedDate) {
      const joinedDate = new Date(row.JoinedDate);
      joinedTimestamp = joinedDate.getTime();
    }

    return {
      firstName: row.FirstName || "",
      lastName: row.LastName || "",
      email: row.Email || "",
      status: "active",
      joinedDate: joinedTimestamp,
      updatedAt: currentTimestamp,
      bio: "I need to update this in my profile!",
      lastOnline: joinedTimestamp, // Use joinedDate as initial lastOnline
      // Optional fields - only include if we have data
      ...(row.Country && { country: row.Country }),
      // Social links would go here if we had them in the CSV
    };
  });
}

// Import to Convex
async function importToConvex(members) {
  console.log(`🚀 Using Convex URL: ${CONVEX_URL}`);
  
  const client = new ConvexHttpClient(CONVEX_URL);
  
  // Split into batches
  const batches = [];
  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    batches.push(members.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`📦 Split into ${batches.length} batches of ${BATCH_SIZE} members each`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    try {
      console.log(`\n📥 Importing batch ${i + 1}/${batches.length}...`);
      
      const result = await client.mutation("importMembers:importMultipleMembers", {
        members: batch
      });
      
      console.log(`✅ Batch ${i + 1}/${batches.length} complete:`);
      console.log(`   - Imported: ${result.summary.imported}`);
      console.log(`   - Skipped: ${result.summary.skipped}`);
      console.log(`   - Errors: ${result.summary.errors}`);
      
      totalImported += result.summary.imported;
      totalSkipped += result.summary.skipped;
      totalErrors += result.summary.errors;
      
      // Show any errors
      if (result.summary.errors > 0) {
        const errorResults = result.results.filter(r => !r.success && r.reason === 'error');
        errorResults.forEach(error => {
          console.log(`   ❌ Error with ${error.name}: ${error.error}`);
        });
      }
      
      // Small delay between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`❌ Failed to import batch ${i + 1}:`, error.message);
      totalErrors++;
    }
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`📊 Final summary:`);
  console.log(`   - Total imported: ${totalImported}`);
  console.log(`   - Total skipped: ${totalSkipped}`);
  console.log(`   - Total errors: ${totalErrors}`);
}

// Main execution
async function main() {
  try {
    // Check if CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      console.log(`❌ CSV file not found: ${csvFilePath}`);
      console.log("Please place your CSV file as 'members.json' in the project root");
      return;
    }

    console.log("📖 Reading CSV file...");
    const csvContent = fs.readFileSync(csvFilePath, "utf8");
    const csvData = parseCSV(csvContent);
    console.log(`Found ${csvData.length} members in CSV`);

    console.log("🔄 Transforming data...");
    const transformedMembers = transformMembers(csvData);
    console.log(`Transformed ${transformedMembers.length} members`);

    console.log("📤 Starting import to Convex...");
    await importToConvex(transformedMembers);

  } catch (error) {
    console.error("❌ Error during import:", error.message);
    process.exit(1);
  }
}

// Check if we have the required dependency and run
try {
  require("convex/browser");
  main();
} catch (error) {
  console.log("❌ Missing convex dependency. Please install it first:");
  console.log("   npm install convex");
}
