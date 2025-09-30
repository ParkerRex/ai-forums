const fs = require("node:fs");
const path = require("node:path");

// Read the user mapping data
const userMappingPath = path.join(__dirname, "../migration-data/user-mapping.json");
const userMapping = JSON.parse(fs.readFileSync(userMappingPath, "utf8"));

// Convert array to map for easier lookup
const userMap = new Map(userMapping);

// List of missing member IDs from the analysis
const missingMemberIds = [
  "j97826m1zcakr9dw3px484y4th7jmt5w",
  "j9740yyamqt922cm8g7bmkqv3d7jg4xm",
  "j97a1hs8ac836sm7qy0077ggj97jnvcc",
  "j978yeydsad4dwzxhvq34fbatx7jndhg",
  "j972ry7ny2w3rxst6j7wtjpqsx7jm1re",
  "j9789sphmbx03nxq8evstfbgz97jnzet",
  "j973x07bgc3wzaagasq97a9j3n7jn8te",
  "j974ds7hards2ffmjp060cvww57jnb7h",
  "j9773vq25fx7s50fdkas49j30s7jm84x",
  "j9719qg8r9w58cjsrr1802v6nx7jnn1h",
  "j97126gy56k5gjqmdtdxd819ws7jn5dr",
  "j97dkv77njtp3t828c214xcmk17jnb6g",
  "j97fxqqdgq1zmtdsjfx7nzgck57jmc4b",
  "j976qdk8ejqcaqsactmxg085697jmwc5",
  "j977qb5j5cy6sc72fe5dv3js5h7jn359",
  "j978mezfwb7jae3wg345zzdzz97jnx1z",
  "j97apaecz4kj8fd6vyyfqvtps97jnh8n",
  "j977g2jfevh02sqnpc4a68xmgs7jn6cf",
  "j979g95xm6sepnrh8emn1f96bs7jnxe3",
  "j97770dnh3cy12wkxgdwt1ahw97jmv8t",
  "j97eyspyk993afekmnj16ffct17jnmnd",
  "j975nre1gzqjh8nezn5cxytas57jmsqw",
  "j97dx6r1qevqxfmxpcgaene39x7jnzxf",
  "j9794a2zyvhksjvpgj3dq7ht8x7jnk3d",
  "j977zyapsh64sns4fzr7xrys2n7jmh6x",
  "j971nb1p7ts06dafh16zhq8akx7jm7yv",
  "j977xpecsz5s8q1e175epap95s7jm4v2",
  "j97bh1j8cexy6mxspcvc0gj5rs7jnrgh",
  "j973f036f1k3zsnrbyscn17kg17jm0ss",
  "j970d2tt2097zc1xk7hzxwyvh17jn8m1",
  "j9725qsqwhsaq670sx7j8b114n7jnfpa",
  "j9705t9yan1c2ywssvnrahrgtn7jmp35",
  "j978egp860ewep24p1vb2r4rd97jnmr3",
  "j976sescs7cqact7f8ftcttx517jmv6c",
  "j97c0gqp17bhy34x26z0bj1tqd7jn2j0",
  "j97371h20wj37txj3321hdjkz97jm9j0",
];

// Find user data for missing members
const missingMembersData = [];
const _notFoundInMapping = [];

// First, let's check what Skool IDs these Convex IDs might correspond to
console.log("Analyzing missing member IDs...\n");

// These IDs look like they might be Skool user IDs that were used as-is
// Let's search for them in the user mapping
for (const [skoolId, userData] of userMap) {
  // Check if any missing member IDs might be related to this Skool ID
  for (const missingId of missingMemberIds) {
    // Since we don't have a direct mapping, we'll need to find these users by other means
    // For now, let's collect all users with @imported.com emails as they're likely the missing ones
    if (userData.email?.includes("@imported.com")) {
      const memberData = {
        skoolId: skoolId,
        convexId: missingId, // This is a guess - we'll need to verify
        email: userData.email,
        firstName: userData.firstName || userData.name.split("-")[0],
        lastName: userData.lastName || "",
        name: userData.name,
        needsRealEmail: true,
      };

      // Check if we already have this user
      if (!missingMembersData.find((m) => m.email === userData.email)) {
        missingMembersData.push(memberData);
      }
    }
  }
}

console.log(`Found ${missingMembersData.length} users with @imported.com emails in the mapping`);
console.log("\nSample of missing members to be created:");
missingMembersData.slice(0, 10).forEach((member) => {
  console.log(`- ${member.firstName} ${member.lastName} (${member.email})`);
});

// Generate the import data for creating missing members
const membersToCreate = missingMembersData.map((member) => ({
  email: member.email,
  firstName: member.firstName,
  lastName: member.lastName,
  joinedDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago as default
}));

// Write the data to a file for import
const outputPath = path.join(__dirname, "../migration-data/missing-members-to-create.json");
fs.writeFileSync(outputPath, JSON.stringify(membersToCreate, null, 2));

console.log(`\nCreated ${outputPath} with ${membersToCreate.length} members to import`);
console.log("\nNext steps:");
console.log("1. Review the missing-members-to-create.json file");
console.log("2. Run the import script to create these members");
console.log("3. Update the posts and comments to use the new member IDs");
console.log("4. Contact members to update their email addresses");

// Also create a report of what we found
const reportPath = path.join(__dirname, "../migration-data/missing-members-analysis.json");
const report = {
  totalMissingIds: missingMemberIds.length,
  foundInMapping: missingMembersData.length,
  notFoundInMapping: missingMemberIds.length - missingMembersData.length,
  missingMemberIds: missingMemberIds,
  sampleMembersToCreate: membersToCreate.slice(0, 10),
  stats: {
    totalUsersInMapping: userMap.size,
    usersWithImportedEmail: Array.from(userMap.values()).filter((u) =>
      u.email?.includes("@imported.com"),
    ).length,
    usersWithValidEmail: Array.from(userMap.values()).filter(
      (u) => u.email && !u.email.includes("@imported.com"),
    ).length,
  },
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nAnalysis report saved to ${reportPath}`);
