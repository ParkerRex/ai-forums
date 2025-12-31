"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
	MemberWithStatus,
	MembershipStats,
	MemberDetailsResponse,
} from "@/types/admin";

// ==================== Types ====================

type TimeRange = "7d" | "30d" | "90d" | "1y" | "all";

type PaymentMetrics = {
	revenue: { net: number; gross: number };
	members: {
		total: number;
		paid: number;
		new: number;
		billingBreakdown: { monthly: number; yearly: number };
	};
	tiers: Record<string, { totalRevenue: number; count: number }>;
	paymentMethods: Record<string, { count: number; revenue: number }>;
};

type MRRHistory = { month: string; mrr: number }[];

type ChurnAnalysis = {
	summary: { monthlyChurnRate: number; churnedMembers: number };
	retentionRate: number;
	recentChurns: { avgLifetimeMonths: number };
	churnByTier: Record<string, { count: number }>;
};

type WebhookHealth = {
	status: "healthy" | "warning" | "critical";
	lastChecked: number;
	issues: string[];
	metrics: {
		totalEvents: number;
		failureRate: number;
		avgProcessingTime: number;
		duplicateRate: number;
		eventTypeMetrics: Record<
			string,
			{ total: number; processed: number; failed: number }
		>;
	};
};

type WebhookFailure = {
	eventId: string;
	type: string;
	error: string | undefined;
	createdAt: number;
	age: number;
};

type EnrichedReport = {
	_id: string;
	commentId: string;
	reporterId: string;
	reason: string;
	reasonText?: string;
	status: "pending" | "resolved" | "dismissed";
	createdAt: number;
	comment: {
		_id: string;
		content: string;
		author: {
			_id: string;
			firstName: string;
			lastName: string;
			email: string;
		} | null;
	} | null;
	reporter: {
		_id: string;
		firstName: string;
		lastName: string;
		email: string;
	} | null;
	post: {
		_id: string;
		title: string;
		slug: string;
		categoryName: string | null;
	} | null;
};

// ==================== Fetch Functions ====================

async function fetchAdminMembers(options?: {
	status?: string;
	search?: string;
	limit?: number;
}): Promise<MemberWithStatus[]> {
	const params = new URLSearchParams();
	if (options?.status && options.status !== "all") {
		params.set("status", options.status);
	}
	if (options?.search) {
		params.set("search", options.search);
	}
	if (options?.limit) {
		params.set("limit", options.limit.toString());
	}

	const res = await fetch(`/api/admin/members?${params.toString()}`);
	if (!res.ok) {
		if (res.status === 403) throw new Error("Forbidden");
		throw new Error("Failed to fetch members");
	}
	return res.json();
}

async function fetchAdminMemberStats(): Promise<MembershipStats> {
	const res = await fetch("/api/admin/members/stats");
	if (!res.ok) {
		if (res.status === 403) throw new Error("Forbidden");
		throw new Error("Failed to fetch member stats");
	}
	return res.json();
}

async function fetchAdminMemberDetails(
	memberId: string,
): Promise<MemberDetailsResponse> {
	const res = await fetch(`/api/admin/members/${memberId}`);
	if (!res.ok) {
		if (res.status === 403) throw new Error("Forbidden");
		if (res.status === 404) throw new Error("Member not found");
		throw new Error("Failed to fetch member details");
	}
	return res.json();
}

async function fetchAdminMetrics(timeRange: TimeRange): Promise<PaymentMetrics> {
	const res = await fetch(`/api/admin/analytics?timeRange=${timeRange}`);
	if (!res.ok) {
		if (res.status === 403) throw new Error("Forbidden");
		throw new Error("Failed to fetch metrics");
	}
	return res.json();
}

async function fetchMRRHistory(): Promise<MRRHistory> {
	const res = await fetch("/api/admin/mrr-history");
	if (!res.ok) {
		if (res.status === 403) throw new Error("Forbidden");
		throw new Error("Failed to fetch MRR history");
	}
	return res.json();
}

async function fetchChurnAnalysis(): Promise<ChurnAnalysis> {
	const res = await fetch("/api/admin/churn-analysis");
	if (!res.ok) {
		if (res.status === 403) throw new Error("Forbidden");
		throw new Error("Failed to fetch churn analysis");
	}
	return res.json();
}

async function fetchWebhookHealth(): Promise<WebhookHealth> {
	const res = await fetch("/api/admin/webhook-health");
	if (!res.ok) {
		if (res.status === 403) throw new Error("Forbidden");
		throw new Error("Failed to fetch webhook health");
	}
	return res.json();
}

async function fetchWebhookFailures(limit?: number): Promise<WebhookFailure[]> {
	const params = new URLSearchParams();
	if (limit) params.set("limit", limit.toString());

	const res = await fetch(`/api/admin/webhook-failures?${params.toString()}`);
	if (!res.ok) {
		if (res.status === 403) throw new Error("Forbidden");
		throw new Error("Failed to fetch webhook failures");
	}
	return res.json();
}

async function fetchReportedComments(
	status?: string,
	limit?: number,
): Promise<EnrichedReport[]> {
	const params = new URLSearchParams();
	if (status) params.set("status", status);
	if (limit) params.set("limit", limit.toString());

	const res = await fetch(`/api/admin/reported-comments?${params.toString()}`);
	if (!res.ok) {
		if (res.status === 403) throw new Error("Forbidden");
		throw new Error("Failed to fetch reported comments");
	}
	return res.json();
}

// ==================== Mutation Functions ====================

async function updateMemberRole(data: {
	memberId: string;
	role: "admin" | "user";
}): Promise<{ success: boolean }> {
	const res = await fetch("/api/admin/members/update-role", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		const error = await res.json();
		throw new Error(error.error || "Failed to update role");
	}
	return res.json();
}

async function resolveReport(data: {
	reportId: string;
	action: "resolve" | "dismiss";
	deleteComment?: boolean;
}): Promise<{ success: boolean }> {
	const res = await fetch("/api/admin/resolve-report", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		const error = await res.json();
		throw new Error(error.error || "Failed to resolve report");
	}
	return res.json();
}

async function updateMember(
	memberId: string,
	data: { role?: string; status?: string },
): Promise<MemberWithStatus> {
	const res = await fetch(`/api/admin/members/${memberId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		const error = await res.json();
		throw new Error(error.error || "Failed to update member");
	}
	return res.json();
}

// ==================== Hooks ====================

/**
 * Hook to fetch admin members list
 */
export function useAdminMembers(options?: {
	status?: string;
	search?: string;
	limit?: number;
}) {
	return useQuery({
		queryKey: ["admin", "members", options],
		queryFn: () => fetchAdminMembers(options),
	});
}

/**
 * Hook to fetch admin member statistics
 */
export function useAdminMemberStats() {
	return useQuery({
		queryKey: ["admin", "members", "stats"],
		queryFn: fetchAdminMemberStats,
	});
}

/**
 * Hook to fetch detailed member info for admin
 */
export function useAdminMemberDetails(memberId: string | null) {
	return useQuery({
		queryKey: ["admin", "members", memberId],
		queryFn: () => fetchAdminMemberDetails(memberId!),
		enabled: !!memberId,
	});
}

/**
 * Hook to update member role
 */
export function useUpdateMemberRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateMemberRole,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
		},
	});
}

/**
 * Hook to update member data
 */
export function useUpdateMember() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			memberId,
			data,
		}: {
			memberId: string;
			data: { role?: string; status?: string };
		}) => updateMember(memberId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
		},
	});
}

/**
 * Hook to fetch analytics metrics
 */
export function useAdminMetrics(timeRange: TimeRange) {
	return useQuery({
		queryKey: ["admin", "metrics", timeRange],
		queryFn: () => fetchAdminMetrics(timeRange),
	});
}

/**
 * Hook to fetch MRR history
 */
export function useAdminMRRHistory() {
	return useQuery({
		queryKey: ["admin", "mrr-history"],
		queryFn: fetchMRRHistory,
	});
}

/**
 * Hook to fetch churn analysis
 */
export function useAdminChurnAnalysis() {
	return useQuery({
		queryKey: ["admin", "churn-analysis"],
		queryFn: fetchChurnAnalysis,
	});
}

/**
 * Hook to fetch webhook health
 */
export function useWebhookHealth() {
	return useQuery({
		queryKey: ["admin", "webhook-health"],
		queryFn: fetchWebhookHealth,
		refetchInterval: 30000, // Refresh every 30 seconds
	});
}

/**
 * Hook to fetch webhook failures
 */
export function useWebhookFailures(limit?: number) {
	return useQuery({
		queryKey: ["admin", "webhook-failures", limit],
		queryFn: () => fetchWebhookFailures(limit),
		refetchInterval: 30000,
	});
}

/**
 * Hook to fetch reported comments
 */
export function useReportedComments(status?: string, limit?: number) {
	return useQuery({
		queryKey: ["admin", "reported-comments", status, limit],
		queryFn: () => fetchReportedComments(status, limit),
	});
}

/**
 * Hook to resolve/dismiss a report
 */
export function useResolveReport() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: resolveReport,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin", "reported-comments"] });
		},
	});
}

// Re-export types
export type {
	TimeRange,
	PaymentMetrics,
	MRRHistory,
	ChurnAnalysis,
	WebhookHealth,
	WebhookFailure,
	EnrichedReport,
};
