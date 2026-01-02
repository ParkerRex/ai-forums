/**
 * Avatar utility functions for handling avatar URLs and fallbacks
 */

/**
 * Get a safe avatar URL with fallback handling
 * Image resizing is handled by Next.js Image component instead of CDN
 * @param avatarUrl - The avatar URL from the database
 * @param _size - Deprecated: size is now handled by Next.js Image component
 * @returns A safe avatar URL or undefined
 */
export function getAvatarUrl(avatarUrl?: string | null, _size?: number): string | undefined {
  if (!avatarUrl) return undefined;

  // Validate URL format
  if (!avatarUrl.startsWith("http://") && !avatarUrl.startsWith("https://")) {
    console.warn(`Invalid avatar URL format: ${avatarUrl}`);
    return undefined;
  }

  // Return original URL - Next.js Image handles optimization
  return avatarUrl;
}

/**
 * Extract object key from storage URL
 * @param url - The full storage URL
 * @returns The object key or null if invalid
 */
export function extractObjectKey(url: string): string | null {
  if (!url || !url.includes("/uploads/")) {
    return null;
  }

  const parts = url.split("/uploads/");
  if (parts.length > 1) {
    return `uploads/${parts[1]}`;
  }

  return null;
}

/**
 * Generate initials from a name
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Two-letter initials
 */
export function getInitials(firstName: string, lastName: string): string {
  const firstInitial = firstName.charAt(0).toUpperCase();
  const lastInitial = lastName.charAt(0).toUpperCase();
  return `${firstInitial}${lastInitial}`;
}

/**
 * Check if an avatar URL is valid and accessible
 * @param url - The avatar URL to check
 * @returns Promise<boolean> - True if accessible, false otherwise
 */
export async function isAvatarAccessible(url: string): Promise<boolean> {
  if (!url) return false;

  try {
    await fetch(url, {
      method: "HEAD",
      mode: "no-cors", // Avoid CORS issues
    });
    // In no-cors mode, we can't read the status but if it doesn't throw, it's likely accessible
    return true;
  } catch (error) {
    console.warn("Avatar accessibility check failed:", error);
    return false;
  }
}

/**
 * Validate avatar file before upload
 * @param file - The file to validate
 * @returns An error message if invalid, null if valid
 */
export function validateAvatarFile(file: File): string | null {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type.toLowerCase())) {
    return "Invalid file type. Please use JPEG, PNG, or WebP.";
  }

  if (file.size > maxSize) {
    return `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB.`;
  }

  return null;
}
