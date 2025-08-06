/**
 * @fileoverview Loading Component for Members Directory
 *
 * This is a Next.js loading component that provides a loading state
 * for the members directory page. Currently returns null as the main
 * component handles its own loading states with skeleton screens.
 *
 * In Next.js 13+ with the app directory, loading.tsx files are used
 * to show loading UI while the page is being fetched. This component
 * could be enhanced to show a custom loading spinner or skeleton.
 *
 * @author VAI Development Team
 * @version 1.0.0
 */

/**
 * Loading component for the members directory page.
 *
 * Currently returns null because the main MembersPageContent component
 * handles its own progressive loading states with skeleton screens.
 * This approach provides more granular control over loading states.
 *
 * @component
 * @returns {null} Returns null to let the main component handle loading
 *
 * @example
 * ```tsx
 * // Automatically used by Next.js when navigating to /members
 * // Shows this component while page.tsx is loading
 * ```
 *
 * @todo Consider adding a simple loading spinner or skeleton here
 * for initial navigation to provide immediate feedback
 */
export default function Loading() {
  // Return null to allow the main component to handle its own loading states
  // This gives us more control over progressive loading and skeleton screens
  return null;
}
