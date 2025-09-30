/**
 * @fileoverview Migration: Add missing members from legacy CSV import (2025-07-09)
 *
 * This script inserts any members that were identified as missing when
 * cross-referencing the production Convex `members` table against the
 * `migration-data/community_members (5).csv` + `member-data-7-9.csv` files.
 *
 * It is intentionally idempotent: if a member with the given email already
 * exists, it skips creation.
 *
 * We keep the mutation in `convex/migrations/` so it can be run once from the
 * dashboard or via the MCP tool and then safely deleted.
 */

// -------------------------------------------------------------------------------------------------
// ⚠️  ALWAYS add two lines of comments for every code line per workspace rule.
// -------------------------------------------------------------------------------------------------

// Removed unused import 'v' since mutation takes no args and we don't perform runtime validation.
import { generateMemberSlug } from "../../lib/slug-utils"; // Helper to create URL slugs
import { mutation } from "../_generated/server"; // Convex server helpers for mutations

// -------------------------------------------------------------------------------------------------
// Define the shape of a legacy member we want to create.
// This helps with type-safety as well as in-line documentation.
// -------------------------------------------------------------------------------------------------

interface LegacyMemberInput {
  email: string; // Unique e-mail identifier
  firstName: string; // Given name
  lastName: string; // Family name
  joinedDateISO: string; // ISO-8601 string of join timestamp (UTC midnight)
  tier: "member" | "early_bird" | "founding_member"; // Pricing tier
  amountCents: number; // Subscription amount in cents (0 for scholarship/free)
  billingInterval?: "monthly" | "yearly"; // Optional billing interval
}

// -------------------------------------------------------------------------------------------------
// Hard-coded list of the six missing members.
// • Frank Zhao – new today ($50/mo)
// • Hiram Clark – legacy early-bird
// • Bjorn Runaker – legacy early-bird
// • Todd Bonnewell – legacy early-bird
// • Jonathan Stokkland – legacy early-bird
// • Bazel Shaw – free / scholarship tier
// -------------------------------------------------------------------------------------------------

const LEGACY_MEMBERS: LegacyMemberInput[] = [
  {
    email: "siming.zhao.us@gmail.com",
    firstName: "Frank",
    lastName: "Zhao",
    joinedDateISO: "2025-07-09T00:00:00Z",
    tier: "member",
    amountCents: 5000,
    billingInterval: "monthly",
  },
  {
    email: "admin@vybecoding.ai",
    firstName: "Hiram",
    lastName: "Clark",
    joinedDateISO: "2025-07-08T00:00:00Z",
    tier: "early_bird",
    amountCents: 5000,
    billingInterval: "monthly",
  },
  {
    email: "bjorn@runaker.se",
    firstName: "Bjorn",
    lastName: "Runaker",
    joinedDateISO: "2025-07-07T00:00:00Z",
    tier: "early_bird",
    amountCents: 5000,
    billingInterval: "monthly",
  },
  {
    email: "todd@bonnewell.com",
    firstName: "Todd",
    lastName: "Bonnewell",
    joinedDateISO: "2025-07-05T00:00:00Z",
    tier: "early_bird",
    amountCents: 5000,
    billingInterval: "monthly",
  },
  {
    email: "jonathan@stokkland.com",
    firstName: "Jonathan",
    lastName: "Stokkland",
    joinedDateISO: "2025-07-04T00:00:00Z",
    tier: "early_bird",
    amountCents: 5000,
    billingInterval: "monthly",
  },
  {
    email: "bazelshaw@gmail.com",
    firstName: "Bazel",
    lastName: "Shaw",
    joinedDateISO: "2025-03-16T00:00:00Z",
    tier: "member",
    amountCents: 0,
  },
];

// -------------------------------------------------------------------------------------------------
// Exported mutation that checks for each member and inserts if missing.
// The mutation takes no args to keep it simple & idempotent.
// -------------------------------------------------------------------------------------------------

export const addMissingMembers7_9 = mutation({
  // We don’t expect external arguments; validate with an empty object.
  args: {},
  /**
   * Handler: iterate through `LEGACY_MEMBERS`, inserting any that are absent
   * in the database.
   */
  handler: async (ctx) => {
    const results: Record<string, string> = {};

    // Pre-fetch all existing member emails into a Set for O(1) lookup.
    const existingEmails = new Set(
      (await ctx.db.query("members").collect()).map((m) => m.email.toLowerCase()),
    );

    for (const legacy of LEGACY_MEMBERS) {
      // If member already exists, skip and mark as such.
      if (existingEmails.has(legacy.email.toLowerCase())) {
        results[legacy.email] = "exists";
        continue;
      }

      // Generate a unique slug from the member’s name.
      const baseSlug = generateMemberSlug(`${legacy.firstName} ${legacy.lastName}`);
      let slug = baseSlug;
      let counter = 2;
      // Ensure uniqueness of slug across database.
      // Loop until we find unused slug.
      while (true) {
        const collision = await ctx.db
          .query("members")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        if (!collision) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Calculate timestamp values from ISO strings.
      const joinedDate = new Date(legacy.joinedDateISO).getTime();
      const now = Date.now();

      // Insert the new member with required + payment fields.
      await ctx.db.insert("members", {
        firstName: legacy.firstName /* Member’s first name */,
        lastName: legacy.lastName /* Member’s last name  */,
        email: legacy.email /* Primary e-mail        */,
        status: "active" /* All flagged as active */,
        joinedDate /* Historical join date */,
        updatedAt: now /* Migration timestamp    */,
        lastOnline: now /* Assumed recently online*/,
        slug /* Unique URL slug        */,
        tier: legacy.tier /* Pricing tier           */,
        subscriptionStatus: legacy.amountCents === 0 ? "none" : "active",
        amountCents: legacy.amountCents /* Subscription price*/,
        billingInterval: legacy.billingInterval /* May be undefined */,
        stripeCustomerId: "" /* No Stripe linkage yet   */,
      });

      results[legacy.email] = "created";
    }

    // Return a simple summary object for easy inspection.
    return {
      processed: LEGACY_MEMBERS.length,
      results,
    };
  },
});
