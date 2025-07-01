export function formatDurationAgo(timestamp: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - timestamp.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    const unit = diffMinutes === 1 ? 'min' : 'mins'
    return `${diffMinutes} ${unit} ago`
  } else if (diffHours < 24) {
    const unit = diffHours === 1 ? 'hr' : 'hrs'
    return `${diffHours} ${unit} ago`
  } else if (diffDays < 7) {
    const unit = diffDays === 1 ? 'day' : 'days'
    return `${diffDays} ${unit} ago`
  } else {
    const weeks = Math.floor(diffDays / 7)
    const unit = weeks === 1 ? 'week' : 'weeks'
    return `${weeks} ${unit} ago`
  }
}