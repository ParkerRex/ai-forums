#!/usr/bin/env node
// Create placeholder members for users that don't exist yet

const fs = require("node:fs");
const path = require("node:path");

// Read the import data
const posts = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/posts-import-fixed.json"), "utf8"),
);
const comments = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../migration-data/comments-import-fixed.json"), "utf8"),
);

// Get all unique emails
const allEmails = new Set();
posts.forEach((post) => allEmails.add(post.authorEmail));
comments.forEach((comment) => allEmails.add(comment.authorEmail));

// Filter for @imported.com emails
const importedEmails = Array.from(allEmails).filter((email) => email.endsWith("@imported.com"));

console.log("Found placeholder emails that need members created:");
importedEmails.forEach((email) => {
  const namePart = email.split("@")[0];
  const nameWithoutNumbers = namePart.replace(/-\d+$/, "");
  const parts = nameWithoutNumbers.split("-");
  const firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "Unknown";
  const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "User";

  console.log(`
Email: ${email}
First Name: ${firstName}
Last Name: ${lastName}
---`);
});

console.log(`
To create these members, run the following in the Convex dashboard:

Function: importMembers:upsertMember

For each member, use these arguments:`);

importedEmails.forEach((email) => {
  const namePart = email.split("@")[0];
  const nameWithoutNumbers = namePart.replace(/-\d+$/, "");
  const parts = nameWithoutNumbers.split("-");
  const firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "Unknown";
  const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "User";

  console.log(`
{
  "email": "${email}",
  "firstName": "${firstName}",
  "lastName": "${lastName}",
  "joinedDate": ${Date.now()}
}`);
});
