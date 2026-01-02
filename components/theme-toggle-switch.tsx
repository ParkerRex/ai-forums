"use client";

import { useTheme } from "next-themes";
import * as React from "react";
import { LaptopMinimalCheckIcon } from "@/components/icons/laptop-minimal-check";
import { MoonIcon } from "@/components/icons/moon";
import { SunIcon } from "@/components/icons/sun";
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
      <div className={cn("bg-muted/50 h-9 rounded-md p-0.5", className)}>
        <div className="flex gap-0.5">
          <div className="h-8 w-7 rounded-none" />
          <div className="h-8 w-7 rounded-none" />
          <div className="h-8 w-7 rounded-none" />
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
      className={cn("bg-muted/50 h-9 p-0.5", className)}
    >
      <ToggleGroupItem
        value="light"
        aria-label="Light theme"
        className="data-[state=on]:bg-background h-full w-7 p-0 data-[state=on]:shadow-xs"
      >
        <SunIcon size={12} />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="system"
        aria-label="System theme"
        className="data-[state=on]:bg-background h-full w-7 p-0 data-[state=on]:shadow-xs"
      >
        <LaptopMinimalCheckIcon size={12} />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        aria-label="Dark theme"
        className="data-[state=on]:bg-background h-full w-7 p-0 data-[state=on]:shadow-xs"
      >
        <MoonIcon size={12} />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
