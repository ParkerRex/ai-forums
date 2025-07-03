import React from 'react'
import { DiscordStatus } from './discord-status'
import { LastPushTag } from './last-push-tag'
import { WeeklyCountdown } from './weekly-countdown'
import { ThemeToggle } from './theme-toggle'
import { BugReportButton } from './bug-report-button'

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-[24px] border-t border-border bg-background flex items-center justify-between px-4 gap-4">
      <ThemeToggle />
      <div className="flex items-center gap-4">
        <BugReportButton />
        <WeeklyCountdown />
        <LastPushTag />
        <DiscordStatus />
      </div>
    </footer>
  )
}
