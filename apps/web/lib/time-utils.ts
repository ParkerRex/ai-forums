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

export function formatEventTime(startTime: number, endTime: number): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();
  
  if (start.toDateString() === now.toDateString()) {
    return `Today ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (start.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  return `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

export function getEventStatus(startTime: number, endTime: number): "upcoming" | "live" | "completed" {
  const now = Date.now();
  
  if (now < startTime) return "upcoming";
  if (now >= startTime && now <= endTime) return "live";
  return "completed";
}

export function isEventToday(startTime: number): boolean {
  const eventDate = new Date(startTime);
  const today = new Date();
  return eventDate.toDateString() === today.toDateString();
}
