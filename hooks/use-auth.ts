/**
 * Authentication Hook
 *
 * Provides easy access to authentication state and methods.
 * Re-exports useAuth from AuthProvider for convenience.
 *
 * @example
 * import { useAuth } from '@/hooks/use-auth';
 *
 * function MyComponent() {
 *   const { user, isLoading, isAuthenticated, signOut } = useAuth();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!isAuthenticated) return <div>Not signed in</div>;
 *
 *   return <div>Hello {user.firstName}!</div>;
 * }
 */

export { useAuth } from "@/components/auth/AuthProvider";
export type { AuthUser } from "@/components/auth/AuthProvider";
