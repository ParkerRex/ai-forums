import { renderHook } from "@testing-library/react";
import { test, expect, describe, vi, beforeEach } from "vitest";
import { useUserVotes } from "../use-user-votes";

// Mock Convex hooks
vi.mock("convex/react", async () => {
  const actual = await vi.importActual("convex/react");
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

describe("useUserVotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns empty object when no targetIds provided", async () => {
    const { useQuery } = vi.mocked(await import("convex/react"));

    const { result } = renderHook(() => useUserVotes([], "post"));

    expect(useQuery).toHaveBeenCalledWith(expect.any(Object), "skip");
    expect(result.current.votes).toEqual({});
    expect(result.current.isLoading).toBe(false);
  });

  test("queries with correct parameters when targetIds provided", async () => {
    const { useQuery } = vi.mocked(await import("convex/react"));
    const mockVotes = {
      post1: "upvote",
      post3: "upvote",
    };
    useQuery.mockReturnValue(mockVotes);

    const { result } = renderHook(() =>
      useUserVotes(["post1", "post2", "post3"], "post"),
    );

    expect(useQuery).toHaveBeenCalledWith(expect.any(Object), {
      targetIds: ["post1", "post2", "post3"],
      targetType: "post",
    });
    expect(result.current.votes).toEqual(mockVotes);
    expect(result.current.isLoading).toBe(false);
  });

  test("returns loading state when query is undefined", async () => {
    const { useQuery } = vi.mocked(await import("convex/react"));
    useQuery.mockReturnValue(undefined);

    const { result } = renderHook(() => useUserVotes(["post1"], "post"));

    expect(result.current.votes).toEqual({});
    expect(result.current.isLoading).toBe(true);
  });

  test("memoizes targetIds to prevent unnecessary refetches", async () => {
    const { useQuery } = vi.mocked(await import("convex/react"));

    const { rerender } = renderHook(({ ids }) => useUserVotes(ids, "post"), {
      initialProps: { ids: ["post1", "post2"] },
    });

    const firstCallArgs = useQuery.mock.calls[0];

    // Rerender with same IDs in same order
    rerender({ ids: ["post1", "post2"] });

    expect(useQuery).toHaveBeenCalledTimes(2);
    // The memoized array should be the same reference
    expect(useQuery.mock.calls[1][1]).toEqual(firstCallArgs[1]);
  });

  test("updates when targetIds change", async () => {
    const { useQuery } = vi.mocked(await import("convex/react"));

    const { rerender } = renderHook(({ ids }) => useUserVotes(ids, "post"), {
      initialProps: { ids: ["post1", "post2"] },
    });

    // Rerender with different IDs
    rerender({ ids: ["post2", "post3"] });

    expect(useQuery).toHaveBeenLastCalledWith(expect.any(Object), {
      targetIds: ["post2", "post3"],
      targetType: "post",
    });
  });

  test("works with different target types", async () => {
    const { useQuery } = vi.mocked(await import("convex/react"));

    renderHook(() => useUserVotes(["comment1"], "comment"));

    expect(useQuery).toHaveBeenCalledWith(expect.any(Object), {
      targetIds: ["comment1"],
      targetType: "comment",
    });
  });
});
