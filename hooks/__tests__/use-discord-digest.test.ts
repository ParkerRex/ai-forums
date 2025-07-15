import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { Id } from '../../convex/_generated/dataModel';

// Mock the Convex hooks
vi.mock('convex/react', () => ({
  useAction: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('../use-current-member', () => ({
  useCurrentMember: vi.fn(),
}));

// Import the hooks after mocking
import { useDiscordDigest, useDiscordPreferences } from '../use-discord-digest';
import { useAction, useQuery } from 'convex/react';
import { useCurrentMember } from '../use-current-member';

// Get the mocked functions
const mockUseAction = vi.mocked(useAction);
const mockUseQuery = vi.mocked(useQuery);
const mockUseCurrentMember = vi.mocked(useCurrentMember);

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useDiscordDigest', () => {
  const mockMember = { 
    _id: 'member123' as Id<"members">,
    _creationTime: Date.now(),
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    slug: 'test-user'
  };
  const mockPreferences = {
    enabled: true,
    guildId: '1355280592962453585',
    channels: undefined,
  };
  const mockMessages = [
    {
      title: 'Test Discord Message',
      url: 'https://discord.com/channels/123/456/789',
      publishedDate: '2025-01-14T10:00:00Z',
      author: 'testuser',
      summary: 'This is a test Discord message',
      source: 'Discord',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockUseCurrentMember.mockReturnValue({ member: mockMember, isLoading: false });
    mockUseQuery.mockReturnValue(mockPreferences);
    
    // Mock the action function properly
    const mockGetDiscordDigest = vi.fn().mockResolvedValue(mockMessages);
    mockUseAction.mockReturnValue(mockGetDiscordDigest);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useDiscordDigest());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should handle user not signed in', async () => {
    mockUseCurrentMember.mockReturnValue({ member: null, isLoading: false });

    const { result } = renderHook(() => useDiscordDigest());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Please sign in to view Discord digest');
    });
  });

  it('should handle Discord not enabled', async () => {
    mockUseQuery.mockReturnValue({ ...mockPreferences, enabled: false });

    const { result } = renderHook(() => useDiscordDigest());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Discord digest is not enabled. Please enable it in your news source settings.');
      expect(result.current.isEnabled).toBe(false);
    });
  });

  it('should load messages successfully', async () => {
    const { result } = renderHook(() => useDiscordDigest());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.messages).toEqual(mockMessages);
      expect(result.current.error).toBe(null);
      expect(result.current.hasMessages).toBe(true);
    });
  });

  it('should handle cache loading and saving', async () => {
    const cachedData = {
      data: mockMessages,
      timestamp: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000,
    };
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));

    const { result } = renderHook(() => useDiscordDigest());
    
    await waitFor(() => {
      expect(result.current.messages).toEqual(mockMessages);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('discord-digest');
    });
  });

  it('should handle expired cache', async () => {
    const expiredCachedData = {
      data: mockMessages,
      timestamp: Date.now() - 60 * 60 * 1000, // 1 hour ago
      expiresAt: Date.now() - 30 * 60 * 1000, // Expired 30 minutes ago
    };
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredCachedData));

    const { result } = renderHook(() => useDiscordDigest());
    
    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('discord-digest');
    });
  });

  it('should provide manual refresh functionality', async () => {
    const mockGetDiscordDigest = vi.fn().mockResolvedValue(mockMessages);
    mockUseAction.mockImplementation(() => mockGetDiscordDigest);

    const { result } = renderHook(() => useDiscordDigest());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Call refresh
    await result.current.refresh();
    
    expect(mockGetDiscordDigest).toHaveBeenCalledWith({
      userId: mockMember._id,
      limit: 20,
    });
  });

  it('should handle API errors gracefully', async () => {
    const mockGetDiscordDigest = vi.fn().mockRejectedValue(new Error('Discord API error'));
    mockUseAction.mockImplementation(() => mockGetDiscordDigest);

    const { result } = renderHook(() => useDiscordDigest());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toContain('Failed to load Discord messages');
    });
  });

  it('should provide user-friendly error messages', async () => {
    const mockGetDiscordDigest = vi.fn().mockRejectedValue(new Error('bot token not configured'));
    mockUseAction.mockImplementation(() => mockGetDiscordDigest);

    const { result } = renderHook(() => useDiscordDigest());
    
    await waitFor(() => {
      expect(result.current.error).toBe('Discord integration is not available. Please contact support.');
    });
  });

  it('should clear cache when requested', () => {
    const { result } = renderHook(() => useDiscordDigest());
    
    result.current.clearCache();
    
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('discord-digest');
  });
});

describe('useDiscordPreferences', () => {
  const mockMember = { 
    _id: 'member123' as Id<"members">,
    _creationTime: Date.now(),
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    slug: 'test-user'
  };
  const mockPreferences = {
    enabled: true,
    guildId: '1355280592962453585',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseCurrentMember.mockReturnValue({ member: mockMember, isLoading: false });
    mockUseQuery.mockReturnValue(mockPreferences);
  });

  it('should return preferences and loading state', () => {
    const { result } = renderHook(() => useDiscordPreferences());
    
    expect(result.current.preferences).toEqual(mockPreferences);
    expect(result.current.loading).toBe(false);
    expect(result.current.isEnabled).toBe(true);
  });

  it('should handle loading state', () => {
    mockUseQuery.mockReturnValue(undefined);

    const { result } = renderHook(() => useDiscordPreferences());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.isEnabled).toBe(false);
  });

  it('should handle user not signed in', () => {
    mockUseCurrentMember.mockReturnValue({ member: null, isLoading: false });
    // When user is not signed in, the query should be skipped and return undefined
    mockUseQuery.mockReturnValue(undefined);

    const { result } = renderHook(() => useDiscordPreferences());
    
    expect(result.current.preferences).toBe(undefined);
    expect(result.current.isEnabled).toBe(false);
  });
});