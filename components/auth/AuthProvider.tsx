"use client";

/**
 * Custom Authentication Provider
 *
 * Provides authentication state and methods to the entire app.
 * Uses Convex query to fetch current user from custom auth system.
 */

import type { ReactNode } from "react";
import { createContext, useContext, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * User data returned from auth.current query
 */
export interface AuthUser {
  _id: Id<"members">;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  avatarUrl?: string;
  role?: string;
}

/**
 * Authentication context value
 */
interface AuthContextValue {
  /** Current authenticated user, null if not authenticated, undefined if loading */
  user: AuthUser | null | undefined;
  /** Whether authentication state is currently loading */
  isLoading: boolean;
  /** Whether user is authenticated (user is not null) */
  isAuthenticated: boolean;
  /** Sign out the current user */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Authentication Provider Component
 *
 * Wraps the app to provide authentication state to all components.
 * Uses the custom auth.current query to fetch user data.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Query current user from custom auth system
  const user = useQuery(api.auth.current);

  // Sign out mutation
  const signOutMutation = useMutation(api.auth.signOut);

  // Derive loading state
  // In Convex, undefined means loading, null means no user, object means user
  const isLoading = user === undefined;
  const isAuthenticated = user !== null && user !== undefined;

  // Sign out handler
  const signOut = useCallback(async () => {
    try {
      // Get session token from cookie
      const sessionToken = getCookie("vai_session");

      if (sessionToken) {
        // Call Convex mutation to invalidate session
        await signOutMutation({ sessionToken });
      }

      // Clear session cookie via API route
      await fetch("/api/auth/session", {
        method: "DELETE",
      });

      // Redirect to sign-in page
      window.location.href = "/auth/sign-in";
    } catch (error) {
      console.error("Sign out error:", error);
      // Still clear cookie and redirect even if mutation fails
      await fetch("/api/auth/session", {
        method: "DELETE",
      });
      window.location.href = "/auth/sign-in";
    }
  }, [signOutMutation]);

  const value: AuthContextValue = {
    user: user as AuthUser | null | undefined,
    isLoading,
    isAuthenticated,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 *
 * Must be used within an AuthProvider.
 *
 * @example
 * const { user, isLoading, isAuthenticated, signOut } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Helper to get cookie value
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}
