"use client";

import * as React from "react";
import { ArrowDownWideNarrow } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSortHotkey, type SortOption } from "@/hooks/use-sort-hotkey";

// Constants for sort options
const SORT_OPTIONS = [
  {
    option: "newest" as SortOption,
    label: "Newest",
    shortcut: "1"
  },
  {
    option: "popular" as SortOption,
    label: "Popular",
    shortcut: "2"
  },
  {
    option: "trending" as SortOption,
    label: "Trending",
    shortcut: "3"
  }
] as const;

interface SortPopoverProps {
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  className?: string;
}

interface SortItemProps {
  label: string;
  shortcut: string;
  isSelected: boolean;
  onClick: () => void;
}

const SortItem = React.memo(function SortItem({ 
  label, 
  shortcut, 
  isSelected, 
  onClick 
}: SortItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full px-2 py-1.5 text-sm transition-colors focus:outline-none",
        !isSelected && "hover:bg-accent/50 hover:text-accent-foreground focus:bg-accent/50 focus:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground font-medium"
      )}
      role="menuitem"
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      <kbd className="ml-auto text-[11px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded-sm font-mono" aria-label={`Keyboard shortcut: ${shortcut}`}>
        {shortcut}
      </kbd>
    </button>
  );
});

export function SortPopover({ sortBy = "newest", onSortChange, className }: SortPopoverProps) {
  const [open, setOpen] = React.useState(false);
  
  // Use the custom hook for keyboard shortcuts
  useSortHotkey({ 
    onSortChange,
    isOpen: open,
    setIsOpen: setOpen
  });

  const handleSortChange = React.useCallback((sort: SortOption) => {
    onSortChange?.(sort);
    setOpen(false);
  }, [onSortChange]);

  const currentSortLabel = React.useMemo(
    () => SORT_OPTIONS.find(opt => opt.option === sortBy)?.label || "Newest",
    [sortBy]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 font-normal",
                "hover:bg-muted hover:text-foreground",
                "data-[state=open]:bg-muted data-[state=open]:text-foreground",
                className
              )}
              aria-label={`Sort by ${currentSortLabel}. Press S to open sort menu`}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <ArrowDownWideNarrow className="h-4 w-4" aria-hidden="true" />
              <span>{currentSortLabel}</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-2">
          <span>Sort posts</span>
          <kbd className="text-xs bg-primary/10 px-1.5 py-0.5 rounded font-mono">S</kbd>
        </TooltipContent>
      </Tooltip>
      <PopoverContent 
        className="w-48 p-0 bg-popover border-border"
        align="end"
        sideOffset={4}
      >
        <div className="py-1" role="menu" aria-label="Sort options">
          {SORT_OPTIONS.map((option) => (
            <SortItem
              key={option.option}
              {...option}
              isSelected={sortBy === option.option}
              onClick={() => handleSortChange(option.option)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}