import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { generateSlug, ensureUniqueSlug } from "../lib/slug-utils";

export const upsertMember = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    joinedDate: v.number(),
  },
  handler: async (ctx, args) => {
    const { firstName, lastName, email, joinedDate } = args;

    // Check if member already exists by email
    const existing = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const now = Date.now();

    if (existing) {
      const updates: Partial<Doc<"members">> = {};
      // Update names if they differ and existing value is blank or placeholder
      if (firstName && firstName !== existing.firstName) updates.firstName = firstName;
      if (lastName && lastName !== existing.lastName) updates.lastName = lastName;
      // Preserve earliest join date
      if (joinedDate && joinedDate < existing.joinedDate) updates.joinedDate = joinedDate;
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = now;
        await ctx.db.patch(existing._id, updates);
      }
      return existing._id;
    }

    // Generate slug ensuring uniqueness
    const baseSlug = generateSlug(`${firstName} ${lastName}`);
    const existingSlugs = (
      await ctx.db.query("members").withIndex("by_slug").collect()
    )
      .map((m) => m.slug)
      .filter((s): s is string => s !== undefined);
    const slug = ensureUniqueSlug(baseSlug, existingSlugs);

    const memberId = await ctx.db.insert("members", {
      firstName,
      lastName,
      email,
      status: "active",
      joinedDate,
      updatedAt: now,
      lastOnline: joinedDate,
      slug,
    });

    return memberId;
  },
}); 