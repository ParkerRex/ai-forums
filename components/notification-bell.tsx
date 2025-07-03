"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentMember } from "@/hooks/use-current-member";

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { member } = useCurrentMember();

  const unreadCount = useQuery(
    api.notifications.getUnreadNotificationCount,
    member ? {} : "skip",
  );

  if (!member) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative px-2 text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      <Bell size={18} />
      {unreadCount !== undefined && unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
