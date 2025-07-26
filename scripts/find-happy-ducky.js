import { api } from "../convex/_generated/api.js";
import { ConvexClient } from "convex/browser";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function findHappyDucky() {
  console.log("Searching for Happy Ducky member...");

  // Search by name
  const members = await convex.query(api.members.searchByName, {
    firstName: "Happy",
    lastName: "Ducky",
  });

  if (members && members.length > 0) {
    const member = members[0];
    console.log("\nFound Happy Ducky:");
    console.log(`  ID: ${member._id}`);
    console.log(`  Name: ${member.firstName} ${member.lastName}`);
    console.log(`  Email: ${member.email}`);
    console.log(`  Joined: ${new Date(member.joinedDate).toLocaleDateString()}`);
    console.log(`  Status: ${member.status}`);
    
    // Get additional details
    console.log("\nAdditional details:");
    console.log(`  Bio: ${member.bio || "(empty)"}`);
    console.log(`  Location: ${member.location || "(empty)"}`);
    console.log(`  Last Online: ${new Date(member.lastOnline).toLocaleDateString()}`);
    console.log(`  GitHub: ${member.linkGithub || "(empty)"}`);
    console.log(`  X/Twitter: ${member.linkX || "(empty)"}`);
    console.log(`  YouTube: ${member.linkYouTube || "(empty)"}`);
    console.log(`  Website: ${member.websiteUrl || "(empty)"}`);
    console.log(`  Avatar: ${member.avatarUrl || "(empty)"}`);
  } else {
    console.log("Happy Ducky not found!");
  }
}

findHappyDucky()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });