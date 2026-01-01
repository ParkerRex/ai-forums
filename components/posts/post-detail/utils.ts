/**
 * Utility functions for PostDetail components
 */

/**
 * Computes a human-readable time-ago string from a timestamp
 * @param timestamp - Unix timestamp in milliseconds or ISO date string
 * @returns Formatted time string (e.g., "5m", "2h", "3d")
 */
export function getTimeAgo(timestamp: number | string): string {
  const time = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  const now = Date.now();
  const diff = now - time;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days}d ago`;
}
