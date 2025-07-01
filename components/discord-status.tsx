'use client'

import React from 'react'
import { useDiscordPresence } from '@/lib/discord'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function DiscordStatus() {
  const { presenceCount, isLoading } = useDiscordPresence()

  if (isLoading || presenceCount === null) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-xs text-muted-foreground select-none">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>
            <span>Discord</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{presenceCount} online</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}