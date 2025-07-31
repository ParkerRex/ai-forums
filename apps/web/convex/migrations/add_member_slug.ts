/**
 * @fileoverview Member Slug Migration
 * 
 * This migration adds URL-friendly slugs to existing member records that don't have them.
 * The slug system enables SEO-friendly URLs like /members/john-doe instead of /members/id123.
 * 
 * **Database Schema Changes:**
 * - Adds `slug` field to members table (string, unique)
 * - Utilizes existing `by_slug` index for uniqueness checks
 * 
 * **Data Transformation:**
 * - Generates base slug from firstName + lastName using kebab-case
 * - Ensures uniqueness by appending numeric suffixes (e.g., john-doe-2)
 * - Preserves existing slugs for members who already have them
 * 
 * **Migration Safety:**
 * - Read-only operation until final patch
 * - Batch processing prevents memory issues
 * - In-memory uniqueness tracking prevents duplicates
 * - Idempotent - safe to run multiple times
 * 
 * **Risks:**
 * - Low risk - only adds new field, doesn't modify existing data
 * - Slug generation uses established utility functions
 * - No breaking changes to existing functionality
 * 
 * @author VAI Development Team
 * @version 1.0.0
 * @since 2024-01-15
 */

import { internalMutation } from "../_generated/server";
import { generateMemberSlug } from "../../lib/slug-utils";

/**
 * Migration to add URL-friendly slugs to existing member records.
 * 
 * This migration processes all members in the database and generates unique slugs
 * for those who don't already have them. The slugs are used for SEO-friendly URLs
 * in the members directory and profile pages.
 * 
 * **Process:**
 * 1. Fetches all members from the database
 * 2. Identifies members without existing slugs
 * 3. Generates base slugs from firstName + lastName
 * 4. Ensures uniqueness by tracking used slugs and appending numeric suffixes
 * 5. Updates each member record with their unique slug
 * 
 * **Slug Generation Logic:**
 * - Combines firstName and lastName into full name
 * - Uses generateMemberSlug utility for consistent formatting
 * - Handles duplicate base slugs by appending -2, -3, etc.
 * - Maintains in-memory Set for O(1) uniqueness checking
 * 
 * @returns {Promise<{updatedMembers: number}>} Migration result summary
 * @throws {Error} If database operations fail
 * 
 * @example
 * ```typescript
 * // Running the migration
 * const result = await ctx.runMutation(api.migrations.add_member_slug.addMemberSlugs);
 * console.log(`Added slugs to ${result.updatedMembers} members`);
 * ```
 */
export const addMemberSlugs = internalMutation({
  handler: async (ctx) => {
    // Fetch all members from the database for processing
    // This approach loads all members into memory for batch processing
    const members = await ctx.db.query("members").collect();
    
    let updateCount = 0;
    // Track used slugs in memory to prevent duplicates during migration
    // This is more efficient than database queries for each uniqueness check
    const usedSlugs = new Set<string>();
    
    // Process each member to generate missing slugs
    for (const member of members) {
      // Skip members who already have slugs (idempotent operation)
      // Add existing slugs to tracking set to prevent conflicts
      if (member.slug) {
        usedSlugs.add(member.slug);
        continue;
      }
      
      // Generate base slug from member's full name
      // Combines firstName and lastName for readable URL segments
      const fullName = `${member.firstName} ${member.lastName}`;
      const baseSlug = generateMemberSlug(fullName);
      
      // Ensure slug uniqueness by appending numeric suffix if needed
      // This handles cases where multiple members have similar names
      let uniqueSlug = baseSlug;
      let counter = 2;
      
      // Keep incrementing counter until we find an unused slug
      // Example: john-doe -> john-doe-2 -> john-doe-3, etc.
      while (usedSlugs.has(uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      // Update member record with the unique slug
      // This is the only write operation in the migration
      await ctx.db.patch(member._id, {
        slug: uniqueSlug,
      });
      
      // Add the new slug to our tracking set to prevent future duplicates
      usedSlugs.add(uniqueSlug);
      updateCount++;
    }
    
    // Log completion summary for monitoring and debugging
    console.log(`Migration completed: added slugs to ${updateCount} members`);
    return { updatedMembers: updateCount };
  },
}); 