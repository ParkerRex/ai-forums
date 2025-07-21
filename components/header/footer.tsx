import React from 'react'
import { DiscordStatus } from './discord-status'
import { LastPushTag } from '../footer/last-push-tag'
import { WeeklyCountdown } from '../footer/weekly-countdown'
import { ThemeToggleSwitch } from '@/components/theme-toggle-switch'

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-[24px] border-t border-border bg-background flex items-center justify-end px-4 gap-4">
      <WeeklyCountdown />
      <LastPushTag />
      <ThemeToggleSwitch className="h-[18px] scale-75" />
      <DiscordStatus />
    </footer>
  )
}
