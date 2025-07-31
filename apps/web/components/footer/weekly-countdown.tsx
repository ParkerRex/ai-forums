"use client";

import { useEffect, useState } from "react";
import { minutesUntilNextFridayNoon } from "@/lib/week-utils";

export function WeeklyCountdown() {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    // Function to update the countdown
    const updateCountdown = () => {
      setMinutes(minutesUntilNextFridayNoon());
    };

    // Update immediately
    updateCountdown();

    // Update every second for more responsive countdown
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  if (minutes === null) {
    return null;
  }

  // Format the countdown display
  const formatCountdown = (totalMinutes: number): string => {
    if (totalMinutes === 0) {
      return "Community Call starting now!";
    }

    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const mins = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hours}h to Community Call`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m to Community Call`;
    } else {
      return `${mins}m to Community Call`;
    }
  };

  return (
    <span className="text-muted-foreground flex select-none items-center gap-1 font-mono text-xs tracking-tighter">
      <span>⏱</span>
      <span>{formatCountdown(minutes)}</span>
    </span>
  );
}
