import React from "react";
import { render, screen } from "@testing-library/react";
import { test, expect, describe, vi, beforeEach } from "vitest";
import PostList from "../posts/post-list";
import { Id } from "../../convex/_generated/dataModel";

// Mock dependencies
vi.mock("convex/react", () => ({
  usePaginatedQuery: vi.fn(),
}));

vi.mock("../../hooks/use-user-votes", () => ({
  useUserVotes: vi.fn(),
}));

interface MockPostCardProps {
  post: {
    _id: string;
    title: string;
  };
  userVote: string | null;
}

vi.mock("../posts/post-card", () => ({
  default: ({ post, userVote }: MockPostCardProps) => (
    <div data-testid={`post-${post._id}`} data-uservote={userVote}>
      {post.title}
    </div>
  ),
}));

const mockPosts = [
  {
    _id: "post1" as Id<"posts">,
    title: "Post 1",
    content: "Content 1",
    slug: "post-1",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    memberId: "member1" as Id<"members">,
    categoryId: "category1" as Id<"categories">,
    status: "active" as const,
    upvotes: 5,
    downvotes: 0,
    netVotes: 5,
    commentCount: 3,
    viewCount: 10,
    member: {
      _id: "member1" as Id<"members">,
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      username: "johndoe",
      slug: "john-doe",
    },
    category: {
      _id: "category1" as Id<"categories">,
      name: "general",
      displayName: "General",
    },
  },
  {
    _id: "post2" as Id<"posts">,
    title: "Post 2",
    content: "Content 2",
    slug: "post-2",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    memberId: "member1" as Id<"members">,
    categoryId: "category1" as Id<"categories">,
    status: "active" as const,
    upvotes: 3,
    downvotes: 0,
    netVotes: 3,
    commentCount: 1,
    viewCount: 5,
    member: {
      _id: "member1" as Id<"members">,
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      username: "johndoe",
      slug: "john-doe",
    },
    category: {
      _id: "category1" as Id<"categories">,
      name: "general",
      displayName: "General",
    },
  },
];

describe("PostList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("fetches votes in batch and passes to PostCards", async () => {
    const { usePaginatedQuery } = vi.mocked(await import("convex/react"));
    const { useUserVotes } = vi.mocked(
      await import("../../hooks/use-user-votes"),
    );

    // Mock post query response
    usePaginatedQuery.mockReturnValue({
      results: mockPosts,
      status: "CanLoadMore",
      loadMore: vi.fn(),
    });

    // Mock votes response
    useUserVotes.mockReturnValue({
      votes: {
        post1: "upvote",
        // post2 has no vote
      },
      isLoading: false,
    });

    render(<PostList />);

    // Verify batch hook was called with correct post IDs
    expect(useUserVotes).toHaveBeenCalledWith(["post1", "post2"], "post");

    // Verify posts are rendered with correct vote props
    const post1 = screen.getByTestId("post-post1");
    expect(post1).toHaveAttribute("data-uservote", "upvote");

    const post2 = screen.getByTestId("post-post2");
    // null value becomes null attribute, not "null" string
    expect(post2.getAttribute("data-uservote")).toBeNull();
  });

  test("handles loading state", async () => {
    const { usePaginatedQuery } = vi.mocked(await import("convex/react"));

    // Mock loading state
    usePaginatedQuery.mockReturnValue({
      results: undefined,
      status: "LoadingFirstPage",
      loadMore: vi.fn(),
    });

    render(<PostList />);

    // Should show loading skeleton divs with animate-pulse class
    const loadingElements = screen.getAllByText((content, element) => {
      return element?.className?.includes("animate-pulse") ?? false;
    });
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  test("handles empty posts", async () => {
    const { usePaginatedQuery } = vi.mocked(await import("convex/react"));
    const { useUserVotes } = vi.mocked(
      await import("../../hooks/use-user-votes"),
    );

    // Mock empty posts
    usePaginatedQuery.mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    useUserVotes.mockReturnValue({ votes: {}, isLoading: false });

    render(<PostList />);

    // Should show empty state
    expect(screen.getByText(/No posts found/)).toBeTruthy();

    // Should call useUserVotes with empty array
    expect(useUserVotes).toHaveBeenCalledWith([], "post");
  });

  test("handles null results as empty state", async () => {
    const { usePaginatedQuery } = vi.mocked(await import("convex/react"));

    // Mock null results
    usePaginatedQuery.mockReturnValue({
      results: null,
      status: "Exhausted",
      loadMore: vi.fn(),
    });

    render(<PostList />);

    // Should show empty state message
    expect(screen.getByText(/No posts found/)).toBeTruthy();
  });

  test("handles load more functionality", async () => {
    const { usePaginatedQuery } = vi.mocked(await import("convex/react"));
    const mockLoadMore = vi.fn();

    // Mock paginated response with more to load
    usePaginatedQuery.mockReturnValue({
      results: mockPosts,
      status: "CanLoadMore",
      loadMore: mockLoadMore,
    });

    render(<PostList />);

    // Should show Load More button
    const loadMoreButton = screen.getByText("Load More");
    expect(loadMoreButton).toBeTruthy();

    // Click should call loadMore
    loadMoreButton.click();
    expect(mockLoadMore).toHaveBeenCalledWith(20);
  });

  test("shows end of posts when exhausted", async () => {
    const { usePaginatedQuery } = vi.mocked(await import("convex/react"));

    // Mock exhausted state
    usePaginatedQuery.mockReturnValue({
      results: mockPosts,
      status: "Exhausted",
      loadMore: vi.fn(),
    });

    render(<PostList />);

    // Should show end of posts message
    expect(screen.getByText(/You've reached the end/)).toBeTruthy();
  });
});
