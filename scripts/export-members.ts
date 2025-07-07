import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Get the Convex URL from environment variables
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Error: NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  console.error("Please ensure your .env.local file contains NEXT_PUBLIC_CONVEX_URL");
  process.exit(1);
}

async function exportMembers() {
  console.log("Connecting to Convex...");
  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    console.log("Fetching all members...");
    // Fetch all members including their stats
    const members = await client.query(api.members.getMembersWithStats);
    
    console.log(`Found ${members.length} members`);

    // Create the exports directory if it doesn't exist
    const exportsDir = path.join(process.cwd(), "exports");
    await fs.mkdir(exportsDir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `members-export-${timestamp}.json`;
    const filepath = path.join(exportsDir, filename);

    // Format the data for better readability
    const exportData = {
      exportDate: new Date().toISOString(),
      totalMembers: members.length,
      members: members.map(member => ({
        // Basic Info
        id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        slug: member.slug,
        
        // Status & Role
        status: member.status,
        role: member.role || "user", // Default to "user" if not set
        
        // Dates
        joinedDate: new Date(member.joinedDate).toISOString(),
        lastOnline: member.lastOnline ? new Date(member.lastOnline).toISOString() : null,
        updatedAt: member.updatedAt ? new Date(member.updatedAt).toISOString() : null,
        
        // Profile Details
        country: member.country || null,
        location: member.location || null,
        bio: member.bio || null,
        avatarUrl: member.avatarUrl || null,
        websiteUrl: member.websiteUrl || null,
        linkedinUrl: member.linkedinUrl || null,
        skills: member.skills || [],
        
        // Social Links
        linkGithub: member.linkGithub || null,
        linkX: member.linkX || null,
        linkYouTube: member.linkYouTube || null,
        
        // Activity Stats
        stats: {
          postCount: member.postCount || 0,
          commentCount: member.commentCount || 0,
          netVoteCount: member.netVoteCount || 0
        },
        
        // Auth System
        externalId: member.externalId || null,
        
        // Additional fields for manual entry
        subscriptionStatus: null, // To be filled manually based on role
        notes: null // For any additional notes
      }))
    };

    // Write the JSON file
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));
    
    console.log(`\n✅ Export completed successfully!`);
    console.log(`📁 File saved to: ${filepath}`);
    console.log(`\n📊 Export Summary:`);
    console.log(`   - Total members: ${members.length}`);
    console.log(`   - Active members: ${members.filter(m => m.status === "active").length}`);
    console.log(`   - Churned members: ${members.filter(m => m.status === "churned").length}`);
    console.log(`   - Free members: ${members.filter(m => m.status === "free").length}`);
    console.log(`   - Duplicate members: ${members.filter(m => m.status === "duplicate").length}`);
    console.log(`\n📝 Role Distribution:`);
    console.log(`   - Users: ${members.filter(m => !m.role || m.role === "user").length}`);
    console.log(`   - Admins: ${members.filter(m => m.role === "admin").length}`);
    console.log(`\n⚠️  Note: The 'role' and 'subscriptionStatus' fields need to be filled manually.`);

  } catch (error) {
    console.error("Error exporting members:", error);
    process.exit(1);
  }
}

// Run the export
exportMembers();