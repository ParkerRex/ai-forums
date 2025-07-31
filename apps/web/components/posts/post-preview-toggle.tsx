"use client";

import React, { useRef } from "react";
import { Toggle } from "@/web/components/ui/toggle";
import {
  PenToolIcon,
  PenToolIconHandle,
} from "@/web/components/icons/pen-tool";
import {
  TelescopeIcon,
  TelescopeIconHandle,
} from "@/web/components/icons/telescope";
import { cn } from "@/lib/utils";

/**
 * PostPreviewToggle Component
 *
 * A custom toggle component that switches between edit and preview modes
 * with animated icons. Uses the pen-tool icon for edit mode and telescope
 * icon for preview mode.
 *
 * @param value - Current tab value ("edit" or "preview")
 * @param onValueChange - Callback when tab changes
 * @param className - Additional CSS classes
 */
interface PostPreviewToggleProps {
  value: "edit" | "preview";
  onValueChange: (value: "edit" | "preview") => void;
  className?: string;
}

export function PostPreviewToggle({
  value,
  onValueChange,
  className,
}: PostPreviewToggleProps) {
  // Refs for controlling icon animations
  const penToolRef = useRef<PenToolIconHandle>(null);
  const telescopeRef = useRef<TelescopeIconHandle>(null);

  // Handle mouse enter/leave for edit button
  const handleEditMouseEnter = () => {
    penToolRef.current?.startAnimation();
  };

  const handleEditMouseLeave = () => {
    penToolRef.current?.stopAnimation();
  };

  // Handle mouse enter/leave for preview button
  const handlePreviewMouseEnter = () => {
    telescopeRef.current?.startAnimation();
  };

  const handlePreviewMouseLeave = () => {
    telescopeRef.current?.stopAnimation();
  };

  return (
    <div
      className={cn(
        "border-input bg-background inline-flex rounded-md border",
        className,
      )}
    >
      {/* Edit Tab */}
      <Toggle
        pressed={value === "edit"}
        onPressedChange={() => onValueChange("edit")}
        variant="outline"
        size="sm"
        className={cn(
          "border-input rounded-r-none border-0 border-r",
          value === "edit"
            ? "bg-muted text-foreground shadow-sm"
            : "hover:bg-muted/50 bg-transparent",
        )}
        onMouseEnter={handleEditMouseEnter}
        onMouseLeave={handleEditMouseLeave}
      >
        <PenToolIcon ref={penToolRef} size={16} />
        <span className="ml-1">Edit</span>
      </Toggle>

      {/* Preview Tab */}
      <Toggle
        pressed={value === "preview"}
        onPressedChange={() => onValueChange("preview")}
        variant="outline"
        size="sm"
        className={cn(
          "rounded-l-none border-0",
          value === "preview"
            ? "bg-muted text-foreground shadow-sm"
            : "hover:bg-muted/50 bg-transparent",
        )}
        onMouseEnter={handlePreviewMouseEnter}
        onMouseLeave={handlePreviewMouseLeave}
      >
        <TelescopeIcon ref={telescopeRef} size={16} />
        <span className="ml-1">Preview</span>
      </Toggle>
    </div>
  );
}
