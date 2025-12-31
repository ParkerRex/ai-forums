"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type PollOption = {
	id: string;
	text: string;
	voteCount: number;
};

type PollResults = {
	pollOptions: PollOption[];
	totalVotes: number;
	userVotedOptionId: string | null;
	hasEnded: boolean;
	endsAt?: number;
};

type PollVoter = {
	memberId: string;
	firstName: string;
	lastName: string;
	email: string;
	slug: string;
	avatarUrl: string | null;
	votedAt: number;
};

type PollVotersResponse = {
	votesByOption: Record<string, PollVoter[]>;
};

type VoteResponse = {
	success: boolean;
	changed: boolean;
	userVotedOptionId: string;
	pollOptions: PollOption[];
	totalVotes: number;
};

async function fetchPollResults(pollId: string): Promise<PollResults> {
	const response = await fetch(`/api/polls/${pollId}`);
	if (!response.ok) {
		throw new Error("Failed to fetch poll results");
	}
	return response.json();
}

async function fetchPollVoters(pollId: string): Promise<PollVotersResponse> {
	const response = await fetch(`/api/polls/${pollId}/voters`);
	if (!response.ok) {
		throw new Error("Failed to fetch poll voters");
	}
	return response.json();
}

async function voteOnPoll(pollId: string, optionId: string): Promise<VoteResponse> {
	const response = await fetch(`/api/polls/${pollId}/vote`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ optionId }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to vote");
	}
	return response.json();
}

export function usePollResults(pollId: string) {
	return useQuery({
		queryKey: ["poll", pollId],
		queryFn: () => fetchPollResults(pollId),
		enabled: !!pollId,
	});
}

export function usePollVoters(pollId: string, enabled = true) {
	return useQuery({
		queryKey: ["pollVoters", pollId],
		queryFn: () => fetchPollVoters(pollId),
		enabled: !!pollId && enabled,
	});
}

export function useVoteOnPoll() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
			voteOnPoll(pollId, optionId),
		onSuccess: (data, variables) => {
			// Update the poll results cache with the new data
			queryClient.setQueryData(["poll", variables.pollId], (old: PollResults | undefined) => {
				if (!old) return old;
				return {
					...old,
					pollOptions: data.pollOptions,
					totalVotes: data.totalVotes,
					userVotedOptionId: data.userVotedOptionId,
				};
			});
			// Also invalidate to ensure consistency
			queryClient.invalidateQueries({ queryKey: ["poll", variables.pollId] });
			queryClient.invalidateQueries({ queryKey: ["pollVoters", variables.pollId] });
			// Invalidate posts since poll data is also shown there
			queryClient.invalidateQueries({ queryKey: ["posts"] });
		},
	});
}

// Re-export types for use in components
export type { PollOption, PollResults, PollVoter, PollVotersResponse };
