"use client";

import * as React from "react";
import { SunIcon } from "@/components/icons/sun";
import { MoonIcon } from "@/components/icons/moon";
import { LaptopMinimalCheckIcon } from "@/components/icons/laptop-minimal-check";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export function ThemeToggleSwitch({ className }: { className?: string }) {
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("bg-muted/50 p-0.5 h-9 rounded-md", className)}>
        <div className="flex gap-0.5">
          <div className="h-8 w-7 rounded-sm" />
          <div className="h-8 w-7 rounded-sm" />
          <div className="h-8 w-7 rounded-sm" />
        </div>
      </div>
    );
  }

  return (
    <ToggleGroup
      type="single"
      value={theme}
      onValueChange={(value) => {
        if (value) setTheme(value);
      }}
      className={cn(
        "bg-muted/50 p-0.5 h-9",
        className
      )}
    >
      <ToggleGroupItem
        value="light"
        aria-label="Light theme"
        className="h-full w-7 data-[state=on]:bg-background data-[state=on]:shadow-sm p-0"
      >
        <SunIcon size={12} />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="system"
        aria-label="System theme"
        className="h-full w-7 data-[state=on]:bg-background data-[state=on]:shadow-sm p-0"
      >
        <LaptopMinimalCheckIcon size={12} />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        aria-label="Dark theme"
        className="h-full w-7 data-[state=on]:bg-background data-[state=on]:shadow-sm p-0"
      >
        <MoonIcon size={12} />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}