import React from 'react'
import { DiscordStatus } from './discord-status'
import { LastPushTag } from './last-push-tag'
import { WeeklyCountdown } from './weekly-countdown'

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-[24px] border-t border-neutral-700 bg-background flex items-center justify-end px-4 gap-4">
      <WeeklyCountdown />
      <LastPushTag />
      <DiscordStatus />
    </footer>
  )
}