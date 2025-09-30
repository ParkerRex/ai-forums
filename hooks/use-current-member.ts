import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Hook to get the current authenticated member.
 * Returns null if not authenticated.
 * Uses the unified auth system with automatic member creation/updates.
 */
export function useCurrentMember() {
  const member = useQuery(api.auth.current);
  return { member, isLoading: member === undefined };
}
