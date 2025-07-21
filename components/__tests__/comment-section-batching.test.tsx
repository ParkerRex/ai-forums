import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUserVotes } from '@/hooks/use-user-votes';
import { api } from '@/convex/_generated/api';
import * as convexReact from 'convex/react';

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}));

describe('Comment Section Vote Batching', () => {
  it('should batch vote queries for all comments', () => {
    const mockVotes = {
      'comment1': 'upvote' as const,
      'comment3': 'upvote' as const,
    };
    
    vi.mocked(convexReact.useQuery).mockReturnValue(mockVotes);

    const { result } = renderHook(() => 
      useUserVotes(['comment1', 'comment2', 'comment3'], 'comment')
    );

    // Verify the hook was called with batch API
    expect(convexReact.useQuery).toHaveBeenCalledWith(
      api.votes.getUserVotesBatch,
      {
        targetIds: ['comment1', 'comment2', 'comment3'],
        targetType: 'comment',
      }
    );

    // Verify the result
    expect(result.current.votes).toEqual(mockVotes);
    expect(result.current.isLoading).toBe(false);
  });

  it('should skip query when no comment IDs provided', () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);

    const { result } = renderHook(() => 
      useUserVotes([], 'comment')
    );

    // Verify the hook was called with 'skip'
    expect(convexReact.useQuery).toHaveBeenCalledWith(
      api.votes.getUserVotesBatch,
      'skip'
    );

    // Verify the result
    expect(result.current.votes).toEqual({});
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle loading state correctly', () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);

    const { result } = renderHook(() => 
      useUserVotes(['comment1', 'comment2'], 'comment')
    );

    // Verify loading state when votes are undefined but IDs exist
    expect(result.current.isLoading).toBe(true);
  });
});