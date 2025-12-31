"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";

interface AuthWrapperProps {
	children: ReactNode;
}

/**
 * Renders children only when user is authenticated.
 * Replacement for Convex's Authenticated component.
 */
export function Authenticated({ children }: AuthWrapperProps) {
	const { member, isLoading } = useAuth();

	if (isLoading || !member) {
		return null;
	}

	return <>{children}</>;
}

/**
 * Renders children only when user is NOT authenticated.
 * Replacement for Convex's Unauthenticated component.
 */
export function Unauthenticated({ children }: AuthWrapperProps) {
	const { member, isLoading } = useAuth();

	if (isLoading || member) {
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
