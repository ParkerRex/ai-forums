"use client";

import * as React from "react";
import { SunIcon } from "@/components/ui/sun";
import { MoonIcon } from "@/components/ui/moon";
import { LaptopMinimalCheckIcon } from "@/components/ui/laptop-minimal-check";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export function ThemeToggleSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <ToggleGroup
      type="single"
      value={theme}
      onValueChange={(value) => {
        if (value) setTheme(value);
      }}
      className={cn(
        "bg-muted/50 p-1 h-9",
        className
      )}
    >
      <ToggleGroupItem
        value="light"
        aria-label="Light theme"
        className="h-7 w-9 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        <SunIcon size={14} />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="system"
        aria-label="System theme"
        className="h-7 w-9 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        <LaptopMinimalCheckIcon size={14} />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        aria-label="Dark theme"
        className="h-7 w-9 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        <MoonIcon size={14} />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}