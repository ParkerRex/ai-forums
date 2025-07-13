"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ProfileFieldIndicatorProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export function ProfileFieldIndicator({ label, onClick, className }: ProfileFieldIndicatorProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md transition-colors relative",
        className
      )}
      title={`Add ${label}`}
    >
      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-foreground"></span>
      </span>
      <span className="text-muted-foreground">Add {label}</span>
    </button>
  );
}