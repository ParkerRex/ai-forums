import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchItems, rankDiscordMessages, DiscordMessage } from '../discord';
import { DiscordNewsSource } from '../types';

// Mock the fetch function
global.fetch = vi.fn();

describe('Discord News Source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  const mockDiscordSource: DiscordNewsSource = {
    type: 'discord',
    url: 'https://discord.com/channels/1355280592962453585',
    name: 'VAI VEX Discord',
    guildId: '1355280592962453585',
    channels: ['general', 'announcements'],
  };

  const mockDiscordMessages: DiscordMessage[] = [
    {
      id: '123456789',
      content: 'Check out this new AI development!',
      author: {
        id: 'user1',
        username: 'testuser',
        avatar: 'avatar1.png',
      },
      timestamp: '2025-01-14T10:00:00Z',
      reactions: [
        { emoji: '👍', count: 5 },
        { emoji: '🔥', count: 3 },
      ],
      channelId: 'general',
      channelName: 'general',
    },
    {
      id: '987654321',
      content: 'Another interesting message',
      author: {
        id: 'user2',
        username: 'anotheruser',
      },
      timestamp: '2025-01-14T09:00:00Z',
      reactions: [
        { emoji: '❤️', count: 10 },
      ],
      channelId: 'announcements',
      channelName: 'announcements',
    },
    {
      id: '555666777',
      content: 'Message with no reactions',
      author: {
        id: 'user3',
        username: 'thirduser',
      },
      timestamp: '2025-01-14T11:00:00Z',
      reactions: [],
      channelId: 'general',
      channelName: 'general',
    },
  ];

  describe('fetchItems', () => {
    it('should fetch and transform Discord messages successfully', async () => {
      // Mock successful API response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockDiscordMessages }),
      } as Response);

      const result = await fetchItems(mockDiscordSource);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        title: expect.stringContaining('anotheruser'),
        url: expect.stringContaining('discord.com/channels'),
        publishedDate: '2025-01-14T09:00:00Z',
        text: 'Another interesting message',
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchItems(mockDiscordSource);

      expect(result).toEqual([]);
    });

    it('should handle non-Discord source types', async () => {
      const invalidSource = {
        type: 'rss' as const,
        url: 'https://example.com/rss',
        name: 'Example RSS',
      };

      await expect(fetchItems(invalidSource)).rejects.toThrow('Invalid source type for Discord fetcher');
    });

    it('should call API with correct parameters', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] }),
      } as Response);

      await fetchItems(mockDiscordSource);

      expect(fetch).toHaveBeenCalledWith('/api/discord/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"guildId":"1355280592962453585"'),
      });
    });
  });

  describe('rankDiscordMessages', () => {
    it('should rank messages by reaction count (descending)', () => {
      const ranked = rankDiscordMessages([...mockDiscordMessages]);

      // Message with 10 reactions should be first
      expect(ranked[0].id).toBe('987654321');
      expect(ranked[0].reactions.reduce((sum, r) => sum + r.count, 0)).toBe(10);

      // Message with 8 reactions should be second
      expect(ranked[1].id).toBe('123456789');
      expect(ranked[1].reactions.reduce((sum, r) => sum + r.count, 0)).toBe(8);

      // Message with 0 reactions should be last
      expect(ranked[2].id).toBe('555666777');
      expect(ranked[2].reactions.reduce((sum, r) => sum + r.count, 0)).toBe(0);
    });

    it('should use chronological order as fallback for equal reaction counts', () => {
      const messagesWithSameReactions: DiscordMessage[] = [
        {
          ...mockDiscordMessages[0],
          id: 'older',
          timestamp: '2025-01-14T08:00:00Z',
          reactions: [{ emoji: '👍', count: 5 }],
        },
        {
          ...mockDiscordMessages[0],
          id: 'newer',
          timestamp: '2025-01-14T10:00:00Z',
          reactions: [{ emoji: '👍', count: 5 }],
        },
      ];

      const ranked = rankDiscordMessages(messagesWithSameReactions);

      // Newer message should come first when reaction counts are equal
      expect(ranked[0].id).toBe('newer');
      expect(ranked[1].id).toBe('older');
    });

    it('should handle messages with no reactions', () => {
      const messagesWithoutReactions: DiscordMessage[] = [
        {
          ...mockDiscordMessages[0],
          id: 'first',
          timestamp: '2025-01-14T08:00:00Z',
          reactions: [],
        },
        {
          ...mockDiscordMessages[0],
          id: 'second',
          timestamp: '2025-01-14T10:00:00Z',
          reactions: [],
        },
      ];

      const ranked = rankDiscordMessages(messagesWithoutReactions);

      // Should be ordered chronologically (newest first)
      expect(ranked[0].id).toBe('second');
      expect(ranked[1].id).toBe('first');
    });
  });

  describe('message transformation', () => {
    it('should create meaningful titles for messages with content', async () => {
      // Use all messages and check the first one after ranking (highest reactions)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockDiscordMessages }),
      } as Response);

      const result = await fetchItems(mockDiscordSource);

      // The message with 10 reactions should be first after ranking
      expect(result[0].title).toBe('anotheruser: Another interesting message (10 reactions)');
    });

    it('should create fallback titles for messages without content', async () => {
      const messageWithoutContent: DiscordMessage = {
        id: '999888777',
        content: '', // Empty content to test fallback
        author: {
          id: 'testuser123',
          username: 'fallbackuser',
        },
        timestamp: '2025-01-14T12:00:00Z',
        reactions: [
          { emoji: '👍', count: 3 },
        ],
        channelId: 'test-channel',
        channelName: 'test-channel',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [messageWithoutContent] }),
      } as Response);

      const result = await fetchItems(mockDiscordSource);

      expect(result[0].title).toBe('fallbackuser in #test-channel with 3 reactions');
    });

    it('should truncate long message content in titles', async () => {
      const longMessage = {
        ...mockDiscordMessages[0],
        content: 'A'.repeat(150), // Very long content
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [longMessage] }),
      } as Response);

      const result = await fetchItems(mockDiscordSource);

      expect(result[0].title).toContain('...');
      expect(result[0].title.length).toBeLessThan(150);
    });

    it('should generate correct Discord URLs', async () => {
      // Use all messages and check the first one after ranking
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockDiscordMessages }),
      } as Response);

      const result = await fetchItems(mockDiscordSource);

      // The message with highest reactions should be first
      expect(result[0].url).toBe('https://discord.com/channels/announcements/987654321');
    });
  });
});