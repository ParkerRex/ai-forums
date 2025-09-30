/**
 * Utility functions for generating and managing post slugs
 */

import type { Id } from "../convex/_generated/dataModel";

/**
 * Generate a URL-safe slug from a member's full name
 * @param fullName - The member's full name (firstName + lastName)
 * @returns SEO-friendly slug
 */
export function generateMemberSlug(fullName: string): string {
  return generateSlug(fullName);
}

/**
 * Generate a URL-safe slug from a title
 * @param title - The post title
 * @returns SEO-friendly slug
 */
export function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      // Replace spaces and special characters with hyphens
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, "")
      // Limit length to reasonable URL size
      .substring(0, 60)
      // Remove trailing hyphen if truncation created one
      .replace(/-+$/, "")
  );
}

/**
 * Ensure slug uniqueness by appending numeric suffix if needed
 * @param baseSlug - The desired slug
 * @param existingSlugs - Array of existing slugs to check against
 * @returns Unique slug
 */
export function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Validate that a slug is URL-safe
 * @param slug - The slug to validate
 * @returns true if valid
 */
export function isValidSlug(slug: string): boolean {
  // Must contain only lowercase letters, numbers, and hyphens
  // Cannot start or end with hyphen
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length > 0 && slug.length <= 60;
}

/**
 * Generate a URL for a member's profile page
 * @param member - Member object with slug and _id
 * @returns Profile URL path
 */
export function memberProfileUrl(member: { slug: string; _id: Id<"members"> }): string {
  return `/members/${member.slug}`;
}
