import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { test, expect, describe, vi, beforeEach } from "vitest";
import PostCard from "../posts/post-card";
import { Id } from "../../convex/_generated/dataModel";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock Convex hooks
vi.mock("convex/react", async () => {
  const actual = await vi.importActual("convex/react");
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(() => vi.fn()),
    ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
    Authenticated: ({ children }: { children: React.ReactNode }) => children,
    Unauthenticated: () => null,
  };
});

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock member hover card to avoid rendering issues in tests
vi.mock("../members/member-hover-card", () => ({
  MemberHoverCardWrapper: ({ children }: { children: React.ReactNode }) =>
    children,
}));

const mockPost = {
  _id: "post123" as Id<"posts">,
  title: "Test Post",
  content: "Test content",
  slug: "test-post",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  memberId: "member123" as Id<"members">,
  categoryId: "category123" as Id<"categories">,
  status: "active" as const,
  upvotes: 5,
  downvotes: 0,
  netVotes: 5,
  commentCount: 3,
  viewCount: 10,
  isFree: true,
  member: {
    _id: "member123" as Id<"members">,
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    username: "johndoe",
    slug: "john-doe",
  },
  category: {
    _id: "category123" as Id<"categories">,
    name: "general",
    displayName: "General",
  },
};

describe("PostCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("uses userVote prop when provided instead of querying", async () => {
    const { useQuery } = await import("convex/react");
    const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

    render(<PostCard post={mockPost} userVote="upvote" />);

    // Should skip the query when userVote prop is provided
    expect(mockUseQuery).toHaveBeenCalledWith(expect.any(Object), "skip");
  });

  test("queries for user vote when userVote prop is not provided", async () => {
    const { useQuery } = await import("convex/react");
    const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;
    mockUseQuery.mockReturnValue("upvote");

    render(<PostCard post={mockPost} />);

    // Should query when userVote prop is not provided
    expect(mockUseQuery).toHaveBeenCalledWith(expect.any(Object), {
      targetId: mockPost._id,
      targetType: "post",
    });
  });

  test("displays correct vote state from userVote prop", async () => {
    const { useQuery } = await import("convex/react");
    const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;
    mockUseQuery.mockReturnValue(undefined); // Simulating loading state for query

    render(<PostCard post={mockPost} userVote="upvote" />);

    // Find the upvote button and check it shows the upvoted state
    const upvoteButton = screen.getByRole("button", { name: /5/i });
    const icon = upvoteButton.querySelector('[class*="fill-orange-500"]');
    expect(icon).toBeTruthy();
  });

  test("displays correct vote state when userVote prop is null", async () => {
    const { useQuery } = await import("convex/react");
    const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;
    mockUseQuery.mockReturnValue(undefined);

    render(<PostCard post={mockPost} userVote={null} />);

    // Find the upvote button and check it doesn't show the upvoted state
    const upvoteButton = screen.getByRole("button", { name: /5/i });
    const icon = upvoteButton.querySelector('[class*="fill-orange-500"]');
    expect(icon).toBeFalsy();
  });

  test("handles voting correctly with userVote prop", async () => {
    const { useMutation } = await import("convex/react");
    const mockVoteOnPost = vi.fn().mockResolvedValue({
      success: true,
      newVoteType: null,
      upvotes: 4,
      netVotes: 4,
    });

    (useMutation as ReturnType<typeof vi.fn>).mockReturnValue(mockVoteOnPost);

    render(<PostCard post={mockPost} userVote="upvote" />);

    const upvoteButton = screen.getByRole("button", { name: /5/i });
    fireEvent.click(upvoteButton);

    await waitFor(() => {
      expect(mockVoteOnPost).toHaveBeenCalledWith({
        postId: mockPost._id,
        voteType: "remove",
      });
    });
  });

  test("renders without userVote prop (standalone usage)", async () => {
    const { useQuery } = await import("convex/react");
    const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;
    mockUseQuery.mockReturnValue(null);

    render(<PostCard post={mockPost} />);

    expect(screen.getByText("Test Post")).toBeTruthy();
    expect(screen.getByRole("button", { name: /5/i })).toBeTruthy();
  });
});
