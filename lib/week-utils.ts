export function minutesUntilNextFridayNoon(now: Date = new Date()): number {
  // Get current time in ET (UTC-5 or UTC-4 during DST)
  // We'll use a simple approach: Friday 12pm ET = Friday 5pm UTC (standard time) or 4pm UTC (DST)
  // For simplicity, we'll use 5pm UTC year-round (close enough for a countdown)
  
  const currentUTC = new Date(now)
  const currentDay = currentUTC.getUTCDay()
  const currentHour = currentUTC.getUTCHours()
  const currentMinute = currentUTC.getUTCMinutes()
  
  // Calculate days until next Friday
  let daysUntilFriday: number
  
  if (currentDay < 5) {
    // Before Friday
    daysUntilFriday = 5 - currentDay
  } else if (currentDay === 5) {
    // It's Friday
    if (currentHour < 17 || (currentHour === 17 && currentMinute === 0)) {
      // Before 5pm UTC (approximately noon ET)
      daysUntilFriday = 0
    } else {
      // After 5pm UTC on Friday
      daysUntilFriday = 7
    }
  } else {
    // Saturday (6) or Sunday (0)
    daysUntilFriday = (5 + 7 - currentDay) % 7
  }
  
  // Create the target date (next Friday at 5pm UTC)
  const targetDate = new Date(currentUTC)
  targetDate.setUTCDate(targetDate.getUTCDate() + daysUntilFriday)
  targetDate.setUTCHours(17, 0, 0, 0)
  
  // Calculate difference in minutes
  const diffMs = targetDate.getTime() - currentUTC.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  return Math.max(0, diffMinutes)
}