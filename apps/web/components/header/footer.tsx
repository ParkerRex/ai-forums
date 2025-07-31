import React from "react";
import { DiscordStatus } from "./discord-status";
import { LastPushTag } from "../footer/last-push-tag";
import { WeeklyCountdown } from "../footer/weekly-countdown";
import { ThemeToggleSwitch } from "@/web/components/theme-toggle-switch";

export function Footer() {
  return (
    <footer className="border-border bg-background fixed bottom-0 left-0 right-0 flex h-[24px] items-center justify-end gap-4 border-t px-4">
      <WeeklyCountdown />
      <LastPushTag />
      <ThemeToggleSwitch className="h-[18px] scale-75" />
      <DiscordStatus />
    </footer>
  );
}
