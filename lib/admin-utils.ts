/**
 * Admin Utilities
 *
 * Common utility functions for admin components
 */

/**
 * Get display name for a member
 */
export function getMemberDisplayName(member: {
  firstName?: string;
  lastName?: string;
  email: string;
}): string {
  if (member.firstName && member.lastName) {
    return `${member.firstName} ${member.lastName}`;
  }
  return member.email.split("@")[0];
}

/**
 * Get initials for a member's avatar
 */
export function getMemberInitials(member: {
  firstName?: string;
  lastName?: string;
  email: string;
}): string {
  if (member.firstName && member.lastName) {
    return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  }
  return member.email[0].toUpperCase();
}
