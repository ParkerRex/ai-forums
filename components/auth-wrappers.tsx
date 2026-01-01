"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";

interface AuthWrapperProps {
  children: ReactNode;
}

/**
 * Renders children only when user is authenticated.
 */
export function Authenticated({ children }: AuthWrapperProps) {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Renders children only when user is NOT authenticated.
 */
export function Unauthenticated({ children }: AuthWrapperProps) {
  const { user, isLoading } = useAuth();

  if (isLoading || user) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Renders children while auth state is loading.
 */
export function AuthLoading({ children }: AuthWrapperProps) {
  const { isLoading } = useAuth();

  if (!isLoading) {
    return null;
  }

  return <>{children}</>;
}
