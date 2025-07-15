import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DiscordClient, DiscordError, handleDiscordError, RateLimiter, createDiscordClient } from '../discord'

// Mock discord.js
vi.mock('discord.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    login: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    guilds: {
      fetch: vi.fn(),
    },
    user: { tag: 'TestBot#1234' },
    readyAt: new Date(),
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
    GuildMessageReactions: 8,
  },
}))

describe('Discord Connection Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DiscordClient', () => {
    it('should initialize with correct intents', () => {
      const client = new DiscordClient()
      expect(client).toBeInstanceOf(DiscordClient)
    })

    it('should handle connection success', async () => {
      const mockClient = {
        login: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn().mockResolvedValue(undefined),
        on: vi.fn((event, callback) => {
          if (event === 'ready') {
            // Simulate the ready event being fired
            setTimeout(() => callback(), 0)
          }
        }),
        once: vi.fn((event, callback) => {
          if (event === 'ready') {
            setTimeout(() => callback(), 0)
          }
        }),
        user: { tag: 'TestBot#1234' },
        readyAt: new Date(),
      }

      const { Client } = await import('discord.js')
      vi.mocked(Client).mockImplementation(() => mockClient as any)

      const client = new DiscordClient()
      await client.connect('fake-token')

      expect(mockClient.login).toHaveBeenCalledWith('fake-token')
      // After connection and ready event, isConnected should be true
      expect(client.isConnected()).toBe(true)
    })

    it('should handle connection failure', async () => {
      const mockClient = {
        login: vi.fn().mockRejectedValue(new Error('Invalid token')),
        destroy: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        once: vi.fn(),
        user: null,
        readyAt: null,
      }

      const { Client } = await import('discord.js')
      vi.mocked(Client).mockImplementation(() => mockClient as any)

      const client = new DiscordClient()
      
      await expect(client.connect('invalid-token')).rejects.toThrow('Discord connection failed: Invalid token')
    })

    it('should handle disconnection', async () => {
      const mockClient = {
        login: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        once: vi.fn(),
        user: { tag: 'TestBot#1234' },
        readyAt: new Date(),
      }

      const { Client } = await import('discord.js')
      vi.mocked(Client).mockImplementation(() => mockClient as any)

      const client = new DiscordClient()
      await client.disconnect()

      expect(mockClient.destroy).toHaveBeenCalled()
      expect(client.isConnected()).toBe(false)
    })

    it('should throw error when fetching messages while not ready', async () => {
      const client = new DiscordClient()
      
      await expect(client.fetchMessagesFromGuild('123', new Date())).rejects.toThrow('Discord client is not ready')
    })
  })

  describe('Error Handling', () => {
    it('should create DiscordError with message', () => {
      const error = new DiscordError('Test error', 'TEST_CODE')
      
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.name).toBe('DiscordError')
    })

    it('should handle DiscordError in handleDiscordError', () => {
      const originalError = new DiscordError('Original error')
      const result = handleDiscordError(originalError)
      
      expect(result).toBe(originalError)
    })

    it('should convert Error to DiscordError', () => {
      const originalError = new Error('Generic error')
      const result = handleDiscordError(originalError)
      
      expect(result).toBeInstanceOf(DiscordError)
      expect(result.message).toBe('Generic error')
    })

    it('should handle unknown errors', () => {
      const result = handleDiscordError('string error')
      
      expect(result).toBeInstanceOf(DiscordError)
      expect(result.message).toBe('Unknown Discord error occurred')
    })
  })

  describe('RateLimiter', () => {
    it('should initialize with default values', () => {
      const rateLimiter = new RateLimiter()
      expect(rateLimiter).toBeInstanceOf(RateLimiter)
    })

    it('should initialize with custom values', () => {
      const rateLimiter = new RateLimiter(10, 30000)
      expect(rateLimiter).toBeInstanceOf(RateLimiter)
    })

    it('should not wait when under limit', async () => {
      const rateLimiter = new RateLimiter(5, 60000)
      const startTime = Date.now()
      
      await rateLimiter.waitIfNeeded()
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(100) // Should be immediate
    })

    it('should wait when rate limit is reached', async () => {
      const rateLimiter = new RateLimiter(2, 1000) // 2 requests per second
      
      // Make 2 requests quickly
      await rateLimiter.waitIfNeeded()
      await rateLimiter.waitIfNeeded()
      
      // Third request should wait
      const startTime = Date.now()
      await rateLimiter.waitIfNeeded()
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeGreaterThan(500) // Should have waited
    })
  })

  describe('createDiscordClient utility', () => {
    it('should create and connect client', async () => {
      const mockClient = {
        login: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        once: vi.fn((event, callback) => {
          if (event === 'ready') {
            setTimeout(callback, 0)
          }
        }),
        user: { tag: 'TestBot#1234' },
        readyAt: new Date(),
      }

      const { Client } = await import('discord.js')
      vi.mocked(Client).mockImplementation(() => mockClient as any)

      const client = await createDiscordClient('fake-token')
      
      expect(client).toBeInstanceOf(DiscordClient)
      expect(mockClient.login).toHaveBeenCalledWith('fake-token')
    })
  })
})