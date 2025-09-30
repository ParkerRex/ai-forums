import { v } from "convex/values";
import { detectCountryFromLocation } from "../lib/country-utils";
import { mutation } from "./_generated/server";

/**
 * Update member's country based on their location
 * This can be called when a member updates their location
 */
export const updateMemberCountry = mutation({
  args: {
    memberId: v.id("members"),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    const detectedCountry = detectCountryFromLocation(args.location);

    if (detectedCountry) {
      await ctx.db.patch(args.memberId, {
        country: detectedCountry,
      });
    }

    return detectedCountry;
  },
});
