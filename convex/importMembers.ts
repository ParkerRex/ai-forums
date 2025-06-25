import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Define the member data structure for validation
const memberSchema = v.object({
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  status: v.union(v.literal("active"), v.literal("churned"), v.literal("free")),
  joinedDate: v.number(),
  updatedAt: v.number(),
  bio: v.optional(v.string()),
  lastOnline: v.number(),
  country: v.optional(v.string()),
  linkGithub: v.optional(v.string()),
  linkX: v.optional(v.string()),
  linkYouTube: v.optional(v.string()),
  location: v.optional(v.string()),
});

export const importSingleMember = mutation({
  args: memberSchema,
  handler: async (ctx, member) => {
    // Check if member already exists by email
    const existingMember = await ctx.db
      .query("members")
      .filter((q) => q.eq(q.field("email"), member.email))
      .first();

    if (existingMember) {
      console.log(`Member with email ${member.email} already exists, skipping...`);
      return { success: false, reason: "already_exists", email: member.email };
    }

    // Insert the new member
    const memberId = await ctx.db.insert("members", member);
    console.log(`Imported member: ${member.firstName} ${member.lastName} (${member.email})`);
    
    return { success: true, memberId, email: member.email };
  },
});

export const importMultipleMembers = mutation({
  args: {
    members: v.array(memberSchema),
  },
  handler: async (ctx, { members }) => {
    const results = [];
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const member of members) {
      try {
        // Check if member already exists by email
        const existingMember = await ctx.db
          .query("members")
          .filter((q) => q.eq(q.field("email"), member.email))
          .first();

        if (existingMember) {
          console.log(`Member with email ${member.email} already exists, skipping...`);
          results.push({ 
            success: false, 
            reason: "already_exists", 
            email: member.email,
            name: `${member.firstName} ${member.lastName}`
          });
          skipped++;
          continue;
        }

        // Insert the new member
        const memberId = await ctx.db.insert("members", member);
        console.log(`Imported member: ${member.firstName} ${member.lastName} (${member.email})`);
        
        results.push({ 
          success: true, 
          memberId, 
          email: member.email,
          name: `${member.firstName} ${member.lastName}`
        });
        imported++;

      } catch (error) {
        console.error(`Error importing member ${member.email}:`, error);
        results.push({
          success: false,
          reason: "error",
          email: member.email,
          name: `${member.firstName} ${member.lastName}`,
          error: error instanceof Error ? error.message : String(error)
        });
        errors++;
      }
    }

    return {
      summary: {
        total: members.length,
        imported,
        skipped,
        errors
      },
      results
    };
  },
});
