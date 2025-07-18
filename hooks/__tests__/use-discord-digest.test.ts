/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { useDiscordDigest, useDiscordPreferences } from '../use-discord-digest';
import { useCurrentMember } from '../use-current-member';
import { useQuery } from 'convex/react';

// Mock dependencies
vi.mock('../use-current-member');
vi.mock('convex/react');

const mockUseCurrentMember = vi.mocked(useCurrentMember);
const mockUseQuery = vi.mocked(useQuery);

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('useDiscordDigest', () => {
  const mockMember = {
    _id: 'member123' as any,
    name: 'Test User',
  };

  const mockDiscordDigestEntry = {
    messageId: 'msg123',
    content: 'Test message content',
    author: {
      id: 'user123',
      username: 'testuser',
      avatar: 'avatar.png',
    },
    timestamp: Date.now(),
    reactions: [{ emoji: '👍', count: 5 }],
    channelId: 'channel123',
    channelName: 'general',
    reactionScore: 5,
    summary: 'Test summary',
    digestDate: '2024-01-15',
    processedAt: Date.now(),
  };

  const mockPreferences = {
    enabled: true,
    guildId: '1355280592962453585',
    channels: ['channel123'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseCurrentMember.mockReturnValue({ member: null, isLoading: false });
      mockUseQuery.mockReturnValue(undefined);
    });

    it('should return authentication error', () => {
      const { result } = renderHook(() => useDiscordDigest());

      expect(result.current.error).toBe('Please sign in to view Discord digest');
      expect(result.current.loading).toBe(true); // Still loading preferences
      expect(result.current.messages).toEqual([]);
      expect(result.current.isEnabled).toBe(false);
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseCurrentMember.mockReturnValue({ member: mockMember, isLoading: false });
    });

    describe('and Discord is disabled', () => {
      beforeEach(() => {
        mockUseQuery
          .mockReturnValueOnce([]) // Discord digest data
          .mockReturnValueOnce({ ...mockPreferences, enabled: false }); // Preferences
      });

      it('should return disabled error', () => {
        const { result } = renderHook(() => useDiscordDigest());

        expect(result.current.error).toBe(
          'Discord digest is not enabled. Please enable it in your news source settings.'
        );
        expect(result.current.loading).toBe(false);
        expect(result.current.messages).toEqual([]);
        expect(result.current.isEnabled).toBe(false);
      });
    });

    describe('and Discord is enabled', () => {
      beforeEach(() => {
        mockUseQuery
          .mockReturnValueOnce([mockDiscordDigestEntry]) // Discord digest data
          .mockReturnValueOnce(mockPreferences); // Preferences
      });

      it('should return transformed messages', () => {
        const { result } = renderHook(() => useDiscordDigest());

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.isEnabled).toBe(true);
        expect(result.current.hasMessages).toBe(true);
        expect(result.current.isEmpty).toBe(false);

        const message = result.current.messages[0];
        expect(message.title).toBe('testuser: Test message content (5 reactions)');
        expect(message.url).toBe(
          'https://discord.com/channels/1355280592962453585/channel123/msg123'
        );
        expect(message.author).toBe('testuser');
        expect(message.summary).toBe('Test summary');
        expect(message.source).toBe('Discord');
      });

      it('should cache messages to localStorage', async () => {
        renderHook(() => useDiscordDigest());

        await waitFor(() => {
          expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
            'discord-digest',
            expect.stringContaining('"data"')
          );
        });
      });

      it('should handle custom limit parameter', () => {
        renderHook(() => useDiscordDigest(10));

        expect(mockUseQuery).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            userId: mockMember._id,
            limit: 10,
          })
        );
      });
    });

    describe('with cached data', () => {
      const cachedData = {
        data: [
          {
            title: 'Cached message',
            url: 'https://discord.com/channels/123/456/789',
            author: 'cacheduser',
            summary: 'Cached summary',
            source: 'Discord',
          },
        ],
        timestamp: Date.now(),
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes from now
      };

      beforeEach(() => {
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cachedData));
        mockUseQuery
          .mockReturnValueOnce([]) // Empty fresh data
          .mockReturnValueOnce(mockPreferences);
      });

      it('should show cached content when fresh data is unavailable', () => {
        const { result } = renderHook(() => useDiscordDigest());

        expect(result.current.error).toBe(
          'Unable to load fresh Discord data (showing cached content)'
        );
        expect(result.current.messages).toEqual(cachedData.data);
      });
    });

    describe('refresh functionality', () => {
      beforeEach(() => {
        mockUseQuery
          .mockReturnValueOnce([mockDiscordDigestEntry])
          .mockReturnValueOnce(mockPreferences);
      });

      it('should clear cache when refresh is called', () => {
        const { result } = renderHook(() => useDiscordDigest());

        result.current.refresh();

        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('discord-digest');
      });

      it('should handle localStorage errors gracefully', () => {
        mockLocalStorage.removeItem.mockImplementation(() => {
          throw new Error('localStorage error');
        });

        const { result } = renderHook(() => useDiscordDigest());

        expect(() => result.current.refresh()).not.toThrow();
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Failed to clear cache during refresh:',
          expect.any(Error)
        );
      });
    });

    describe('clearCache functionality', () => {
      beforeEach(() => {
        mockUseQuery
          .mockReturnValueOnce([mockDiscordDigestEntry])
          .mockReturnValueOnce(mockPreferences);
      });

      it('should clear cache when clearCache is called', () => {
        const { result } = renderHook(() => useDiscordDigest());

        result.current.clearCache();

        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('discord-digest');
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        // Create truly invalid data that would cause transformation to fail
        mockUseQuery
          .mockReturnValueOnce([{ ...mockDiscordDigestEntry, author: null }]) // Invalid data - missing required author
          .mockReturnValueOnce(mockPreferences);
      });

      it('should handle transformation errors gracefully', () => {
        const { result } = renderHook(() => useDiscordDigest());

        expect(result.current.messages).toEqual([]);
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Failed to transform Discord digest data:',
          expect.any(Error)
        );
      });
    });
  });
});

describe('useDiscordPreferences', () => {
  const mockMember = {
    _id: 'member123' as unknown,
    name: 'Test User',
  };

  const mockPreferences = {
    enabled: true,
    guildId: '1355280592962453585',
    channels: ['channel123'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUseCurrentMember.mockReturnValue({ member: null, isLoading: false });
      mockUseQuery.mockReturnValue(undefined);
    });

    it('should return loading state', () => {
      const { result } = renderHook(() => useDiscordPreferences());

      expect(result.current.loading).toBe(true);
      expect(result.current.preferences).toBe(undefined);
      expect(result.current.isEnabled).toBe(false);
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseCurrentMember.mockReturnValue({ member: mockMember, isLoading: false });
    });

    it('should return preferences when available', () => {
      mockUseQuery.mockReturnValue(mockPreferences);

      const { result } = renderHook(() => useDiscordPreferences());

      expect(result.current.loading).toBe(false);
      expect(result.current.preferences).toEqual(mockPreferences);
      expect(result.current.isEnabled).toBe(true);
    });

    it('should handle disabled preferences', () => {
      mockUseQuery.mockReturnValue({ ...mockPreferences, enabled: false });

      const { result } = renderHook(() => useDiscordPreferences());

      expect(result.current.loading).toBe(false);
      expect(result.current.isEnabled).toBe(false);
    });

    it('should handle loading state', () => {
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useDiscordPreferences());

      expect(result.current.loading).toBe(true);
      expect(result.current.preferences).toBe(undefined);
      expect(result.current.isEnabled).toBe(false);
    });
  });
});