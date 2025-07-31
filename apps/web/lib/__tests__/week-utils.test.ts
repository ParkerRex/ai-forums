import { describe, it, expect } from 'vitest'
import { minutesUntilNextFridayNoon } from '../week-utils'

describe('minutesUntilNextFridayNoon', () => {
  it('should return 0 when it is exactly Friday 5pm UTC (noon ET)', () => {
    // Create a date that is Friday at 5pm UTC
    const fridayNoonET = new Date('2024-01-05T17:00:00Z')
    expect(minutesUntilNextFridayNoon(fridayNoonET)).toBe(0)
  })

  it('should return correct minutes when it is Friday morning UTC', () => {
    // Friday at 3:00 PM UTC (10:00 AM ET)
    const fridayMorningET = new Date('2024-01-05T15:00:00Z')
    // Should be 2 hours = 120 minutes until 5pm UTC
    expect(minutesUntilNextFridayNoon(fridayMorningET)).toBe(120)
  })

  it('should return correct minutes when it is Friday evening UTC', () => {
    // Friday at 7:00 PM UTC (2:00 PM ET)
    const fridayAfternoonET = new Date('2024-01-05T19:00:00Z')
    // Should be approximately 7 days minus 2 hours = 9,960 minutes until next Friday 5pm UTC
    expect(minutesUntilNextFridayNoon(fridayAfternoonET)).toBe(9960)
  })

  it('should return correct minutes when it is Monday UTC', () => {
    // Monday at 2:00 PM UTC (9:00 AM ET)
    const mondayMorningET = new Date('2024-01-01T14:00:00Z')
    // Should be 4 days and 3 hours = 5,940 minutes
    expect(minutesUntilNextFridayNoon(mondayMorningET)).toBe(5940)
  })

  it('should return correct minutes when it is Thursday evening UTC', () => {
    // Thursday at 8:00 PM UTC (3:00 PM ET)
    const thursdayAfternoonET = new Date('2024-01-04T20:00:00Z')
    // Should be 21 hours = 1260 minutes until Friday 5pm UTC
    expect(minutesUntilNextFridayNoon(thursdayAfternoonET)).toBe(1260)
  })

  it('should return correct minutes when it is Saturday UTC', () => {
    // Saturday at 8:00 PM UTC (3:00 PM ET)
    const saturdayAfternoonET = new Date('2024-01-06T20:00:00Z')
    // Should be 5 days and 21 hours = 8,460 minutes
    expect(minutesUntilNextFridayNoon(saturdayAfternoonET)).toBe(8460)
  })

  it('should return correct minutes when it is Sunday UTC', () => {
    // Sunday at 11:00 AM UTC (6:00 AM ET)
    const sundayMorningET = new Date('2024-01-07T11:00:00Z')
    // Should be 5 days and 6 hours = 7,560 minutes
    expect(minutesUntilNextFridayNoon(sundayMorningET)).toBe(7560)
  })

  it('should handle edge case of exactly one minute before Friday 5pm UTC', () => {
    // Friday at 4:59 PM UTC
    const almostNoon = new Date('2024-01-05T16:59:00Z')
    expect(minutesUntilNextFridayNoon(almostNoon)).toBe(1)
  })

  it('should never return negative values', () => {
    // Test various times to ensure no negative values
    const testDates = [
      new Date('2024-01-05T17:00:01Z'), // Just after Friday 5pm UTC
      new Date('2024-01-05T23:59:59Z'), // End of Friday
      new Date('2024-01-03T00:00:00Z'), // Wednesday midnight
    ]
    
    testDates.forEach(date => {
      expect(minutesUntilNextFridayNoon(date)).toBeGreaterThanOrEqual(0)
    })
  })
})