import React from 'react'
import { DiscordStatus } from './discord-status'

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-[24px] border-t border-neutral-700 bg-background flex items-center justify-end px-4 gap-4">
      {/* Weekly countdown component will go here */}
      {/* Last push tag component will go here */}
      <DiscordStatus />
    </footer>
  )
}