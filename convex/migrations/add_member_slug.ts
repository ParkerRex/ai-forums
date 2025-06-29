import { internalMutation } from "../_generated/server";
import { generateMemberSlug } from "../../lib/slug-utils";

/**
 * Migration to add slug field to existing members.
 * Generates unique slugs from firstName + lastName for all members without slugs.
 */
export const addMemberSlugs = internalMutation({
  handler: async (ctx) => {
    const members = await ctx.db.query("members").collect();
    
    let updateCount = 0;
    const usedSlugs = new Set<string>();
    
    for (const member of members) {
      // Skip if member already has a slug
      if (member.slug) {
        usedSlugs.add(member.slug);
        continue;
      }
      
      // Generate base slug from full name
      const fullName = `${member.firstName} ${member.lastName}`;
      const baseSlug = generateMemberSlug(fullName);
      
      // Ensure uniqueness by appending numeric suffix if needed
      let uniqueSlug = baseSlug;
      let counter = 2;
      
      while (usedSlugs.has(uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      // Update member with unique slug
      await ctx.db.patch(member._id, {
        slug: uniqueSlug,
      });
      
      usedSlugs.add(uniqueSlug);
      updateCount++;
    }
    
    console.log(`Migration completed: added slugs to ${updateCount} members`);
    return { updatedMembers: updateCount };
  },
}); 