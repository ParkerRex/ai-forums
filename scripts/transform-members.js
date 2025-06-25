const fs = require("fs");
const path = require("path");

/**
 * Member Import Script
 *
 * This script transforms CSV member data to match the Convex schema format.
 *
 * Usage:
 * 1. Place your CSV file as 'members.json' in the project root
 * 2. Run: node scripts/transform-members.js
 * 3. Use the output file with the Convex import mutation
 *
 * CSV Format Expected:
 * FirstName,LastName,Email,Invited By,JoinedDate,Question1,Answer1,Question2,Answer2,Question3,Answer3
 */

// Configuration - change this to point to your CSV file
const csvFilePath = path.join(__dirname, "../members.json");
const csvContent = fs.readFileSync(csvFilePath, "utf8");

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

// Main execution
try {
  console.log("Reading CSV file...");
  const csvData = parseCSV(csvContent);
  console.log(`Found ${csvData.length} members in CSV`);

  console.log("Transforming data...");
  const transformedMembers = transformMembers(csvData);

  // Write transformed data to JSON file
  const outputPath = path.join(__dirname, "../transformed-members.json");
  fs.writeFileSync(outputPath, JSON.stringify(transformedMembers, null, 2));

  console.log(`✅ Transformation complete! Output written to: ${outputPath}`);
  console.log(`Transformed ${transformedMembers.length} members`);

  // Show a sample of the transformed data
  console.log("\nSample transformed member:");
  console.log(JSON.stringify(transformedMembers[0], null, 2));
} catch (error) {
  console.error("❌ Error during transformation:", error.message);
  process.exit(1);
}
