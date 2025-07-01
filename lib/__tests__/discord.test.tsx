import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDiscordPresence } from '../discord'
import useSWR from 'swr'

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn((key: string) => {
    const mockData: Record<string, any> = {
      '/api/discord': { presence_count: 42 }
    }
    
    const error = key === '/api/discord/error' ? new Error('API Error') : undefined
    const data = !error ? mockData[key] : undefined
    
    return {
      data,
      error,
      isLoading: false,
    }
  })
}))

describe('Discord API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch and return Discord presence count', () => {
    const result = useDiscordPresence()

    expect(result.presenceCount).toBe(42)
    expect(result.isLoading).toBe(false)
    expect(result.isError).toBeFalsy()
  })

  it('should handle loading state', () => {
    // Mock SWR to return loading state
    vi.mocked(useSWR).mockReturnValueOnce({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: vi.fn(),
    } as any)
    
    const result = useDiscordPresence()
    
    expect(result.presenceCount).toBe(null)
    expect(result.isLoading).toBe(true)
    expect(result.isError).toBeFalsy()
  })

  it('should handle empty response', () => {
    // Mock SWR to return empty data
    vi.mocked(useSWR).mockReturnValueOnce({
      data: {},
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as any)
    
    const result = useDiscordPresence()
    
    expect(result.presenceCount).toBe(null)
    expect(result.isLoading).toBe(false)
    expect(result.isError).toBeFalsy()
  })
})