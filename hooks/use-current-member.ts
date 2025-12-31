"use client";

import { useAuth } from "@/components/providers/auth-provider";

/**
 * Hook to get the current authenticated member.
 * Returns null if not authenticated.
 * Uses the custom auth system with PostgreSQL sessions.
 */
export function useCurrentMember() {
	const { member, isLoading } = useAuth();
	return { member, isLoading };
}
