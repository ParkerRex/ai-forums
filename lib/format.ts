/**
 * Formatting Utilities
 * 
 * Centralized formatting functions for consistent display
 * across the application
 */

/**
 * Format currency values with proper locale support
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format dates consistently across the app
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale: string = "en-US"
): string {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(locale, options || {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}

/**
 * Get tier display name with proper formatting
 */
export function formatTierName(tier: string): string {
  const tierNames: Record<string, string> = {
    founding_member: "Founding Member",
    early_bird: "Early Bird",
    member: "Pro Member",
    scholarship: "Scholarship",
    free: "Free",
  };
  
  return tierNames[tier] || tier;
}