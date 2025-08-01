"use client";

import React from "react";
// import { useDiscordPresence } from '@/lib/discord' // TODO: Implement useDiscordPresence hook
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

export function DiscordStatus() {
  // TODO: Implement useDiscordPresence hook
  // const { presenceCount, isLoading } = useDiscordPresence()
  const presenceCount = null;
  const isLoading = false;

  if (isLoading || presenceCount === null) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-muted-foreground flex select-none items-center gap-2 text-xs">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-green-500 opacity-75" />
            </div>
            <span>Discord</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{presenceCount} online</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
