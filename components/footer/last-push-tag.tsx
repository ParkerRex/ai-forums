"use client";

import { useEffect, useState } from "react";
import { GithubIcon } from "@/components/icons/github";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLastCommit } from "@/lib/github";
import { formatDurationAgo } from "@/lib/time-utils";

export function LastPushTag() {
  const { lastCommit, commitData, isLoading, isError } = useLastCommit();
  const [formattedTime, setFormattedTime] = useState<string>("");

  useEffect(() => {
    if (!lastCommit) return;

    // Update immediately
    setFormattedTime(formatDurationAgo(lastCommit));

    // Update every minute
    const interval = setInterval(() => {
      setFormattedTime(formatDurationAgo(lastCommit));
    }, 60000);

    return () => clearInterval(interval);
  }, [lastCommit]);

  if (isLoading || !lastCommit) {
    return null;
  }

  if (isError) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-muted-foreground">
        <GithubIcon size={14} />
        <span>Unavailable</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none cursor-default font-mono uppercase tracking-tighter">
            <GithubIcon size={14} />
            <span>{formattedTime}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{commitData?.message || "Last code committed to main"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
