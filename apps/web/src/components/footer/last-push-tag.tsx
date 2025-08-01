"use client";

import { useEffect, useState } from "react";
import { useLastCommit } from "@/lib/github";
import { formatDurationAgo } from "@/lib/time-utils";
import { GithubIcon } from "../components/icons/github";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

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
      <div className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs uppercase">
        <GithubIcon size={14} />
        <span>Unavailable</span>
      </div>
    );
  }

  return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-muted-foreground flex cursor-default select-none items-center gap-1.5 font-mono text-xs uppercase tracking-tighter">
            <GithubIcon size={14} />
            <span>{formattedTime}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {commitData?.message || "Last code committed to main"}
          </p>
        </TooltipContent>
      </Tooltip>
  );
}
