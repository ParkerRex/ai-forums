import { describe, it, expect } from 'vitest'
import { formatDurationAgo } from '../time-utils'

describe('formatDurationAgo', () => {
  it('should return "just now" for timestamps less than 60 seconds ago', () => {
    const now = new Date()
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000)
    expect(formatDurationAgo(thirtySecondsAgo)).toBe('just now')
  })

  it('should return minutes for timestamps less than 60 minutes ago', () => {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    expect(formatDurationAgo(fiveMinutesAgo)).toBe('5 mins ago')
    
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000)
    expect(formatDurationAgo(oneMinuteAgo)).toBe('1 min ago')
  })

  it('should return hours for timestamps less than 24 hours ago', () => {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    expect(formatDurationAgo(twoHoursAgo)).toBe('2 hrs ago')
    
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000)
    expect(formatDurationAgo(oneHourAgo)).toBe('1 hr ago')
  })

  it('should return days for timestamps less than 7 days ago', () => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    expect(formatDurationAgo(oneDayAgo)).toBe('1 day ago')
    
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    expect(formatDurationAgo(threeDaysAgo)).toBe('3 days ago')
  })

  it('should return weeks for timestamps 7 days or more ago', () => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    expect(formatDurationAgo(oneWeekAgo)).toBe('1 week ago')
    
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    expect(formatDurationAgo(twoWeeksAgo)).toBe('2 weeks ago')
  })

  it('should handle edge cases correctly', () => {
    const now = new Date()
    
    // Exactly 59 seconds ago
    const fiftyNineSecondsAgo = new Date(now.getTime() - 59 * 1000)
    expect(formatDurationAgo(fiftyNineSecondsAgo)).toBe('just now')
    
    // Exactly 60 seconds ago
    const sixtySecondsAgo = new Date(now.getTime() - 60 * 1000)
    expect(formatDurationAgo(sixtySecondsAgo)).toBe('1 min ago')
    
    // Exactly 59 minutes ago
    const fiftyNineMinutesAgo = new Date(now.getTime() - 59 * 60 * 1000)
    expect(formatDurationAgo(fiftyNineMinutesAgo)).toBe('59 mins ago')
    
    // Exactly 60 minutes ago
    const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000)
    expect(formatDurationAgo(sixtyMinutesAgo)).toBe('1 hr ago')
  })
})