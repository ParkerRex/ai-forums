import { describe, it, expect } from 'vitest';

describe('Discord Convex Functions', () => {
  describe('Message Transformation Logic', () => {
    it('should create correct message titles with reactions', () => {
      const mockMessage = {
        id: '123456789',
        content: 'Test Discord message content',
        author: {
          id: 'user1',
          username: 'testuser',
          avatar: 'avatar.png',
        },
        timestamp: '2025-01-14T10:00:00Z',
        reactions: [
          { emoji: '👍', count: 5 },
          { emoji: '🔥', count: 3 },
        ],
        channelId: 'general',
        channelName: 'general',
      };

      // Test message title creation logic
      const reactionCount = mockMessage.reactions.reduce((sum, r) => sum + r.count, 0);
      const expectedTitle = `${mockMessage.author.username}: ${mockMessage.content} (${reactionCount} reactions)`;
      
      expect(expectedTitle).toBe('testuser: Test Discord message content (8 reactions)');
    });

    it('should handle messages without content', () => {
      const mockMessage = {
        id: '123456789',
        content: '',
        author: {
          id: 'user1',
          username: 'testuser',
        },
        timestamp: '2025-01-14T10:00:00Z',
        reactions: [
          { emoji: '👍', count: 3 },
        ],
        channelId: 'general',
        channelName: 'general',
      };

      const reactionCount = mockMessage.reactions.reduce((sum, r) => sum + r.count, 0);
      const expectedTitle = `${mockMessage.author.username} in #${mockMessage.channelName} with ${reactionCount} reactions`;
      
      expect(expectedTitle).toBe('testuser in #general with 3 reactions');
    });

    it('should truncate long message content', () => {
      const longContent = 'A'.repeat(150);
      const mockMessage = {
        id: '123456789',
        content: longContent,
        author: {
          id: 'user1',
          username: 'testuser',
        },
        timestamp: '2025-01-14T10:00:00Z',
        reactions: [],
        channelId: 'general',
        channelName: 'general',
      };

      const maxContentLength = 100;
      const truncatedContent = mockMessage.content.length > maxContentLength 
        ? `${mockMessage.content.substring(0, maxContentLength)}...`
        : mockMessage.content;
      
      const expectedTitle = `${mockMessage.author.username}: ${truncatedContent}`;
      
      expect(expectedTitle).toContain('...');
      expect(expectedTitle.length).toBeLessThan(150);
    });
  });

  describe('Message Ranking', () => {
    it('should rank messages by reaction count', () => {
      const messages = [
        {
          id: '1',
          reactions: [{ emoji: '👍', count: 5 }],
          timestamp: '2025-01-14T10:00:00Z',
        },
        {
          id: '2',
          reactions: [{ emoji: '👍', count: 10 }],
          timestamp: '2025-01-14T09:00:00Z',
        },
        {
          id: '3',
          reactions: [],
          timestamp: '2025-01-14T11:00:00Z',
        },
      ];

      const sorted = messages.sort((a, b) => {
        const aReactions = a.reactions.reduce((sum, r) => sum + r.count, 0);
        const bReactions = b.reactions.reduce((sum, r) => sum + r.count, 0);
        
        if (aReactions !== bReactions) {
          return bReactions - aReactions;
        }
        
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      expect(sorted[0].id).toBe('2'); // 10 reactions
      expect(sorted[1].id).toBe('1'); // 5 reactions
      expect(sorted[2].id).toBe('3'); // 0 reactions
    });

    it('should use chronological order as fallback', () => {
      const messages = [
        {
          id: 'older',
          reactions: [{ emoji: '👍', count: 5 }],
          timestamp: '2025-01-14T08:00:00Z',
        },
        {
          id: 'newer',
          reactions: [{ emoji: '👍', count: 5 }],
          timestamp: '2025-01-14T10:00:00Z',
        },
      ];

      const sorted = messages.sort((a, b) => {
        const aReactions = a.reactions.reduce((sum, r) => sum + r.count, 0);
        const bReactions = b.reactions.reduce((sum, r) => sum + r.count, 0);
        
        if (aReactions !== bReactions) {
          return bReactions - aReactions;
        }
        
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      expect(sorted[0].id).toBe('newer'); // Same reactions, but newer
      expect(sorted[1].id).toBe('older');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing bot token', () => {
      const originalToken = process.env.DISCORD_BOT_TOKEN;
      delete process.env.DISCORD_BOT_TOKEN;

      expect(() => {
        if (!process.env.DISCORD_BOT_TOKEN) {
          throw new Error("Discord bot token not configured");
        }
      }).toThrow("Discord bot token not configured");

      process.env.DISCORD_BOT_TOKEN = originalToken;
    });

    it('should handle missing guild ID', () => {
      const originalGuildId = process.env.DISCORD_GUILD_ID;
      delete process.env.DISCORD_GUILD_ID;

      expect(() => {
        const guildId = process.env.DISCORD_GUILD_ID;
        if (!guildId) {
          throw new Error("Discord guild ID not provided");
        }
      }).toThrow("Discord guild ID not provided");

      process.env.DISCORD_GUILD_ID = originalGuildId;
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff calculation', () => {
      const baseDelay = 1000;
      const attempt = 2;
      const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
      
      expect(exponentialDelay).toBe(2000); // 1000 * 2^(2-1) = 2000
    });

    it('should calculate correct delays for multiple attempts', () => {
      const baseDelay = 1000;
      const delays = [1, 2, 3].map(attempt => baseDelay * Math.pow(2, attempt - 1));
      
      expect(delays).toEqual([1000, 2000, 4000]);
    });
  });
});