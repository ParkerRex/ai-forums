"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { BellIcon } from "@/web/components/icons/bell";
import { Button } from "@/web/components/ui/button";
import { Badge } from "@/web/components/ui/badge";
import { useCurrentMember } from "@/hooks/use-current-member";

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { member } = useCurrentMember();
  const bellIconRef = React.useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);

  const unreadCount = useQuery(
    api.notifications.getUnreadNotificationCount,
    member ? {} : "skip",
  );

  if (!member) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground relative px-2"
      onClick={onClick}
      onMouseEnter={() => bellIconRef.current?.startAnimation()}
      onMouseLeave={() => bellIconRef.current?.stopAnimation()}
    >
      <BellIcon ref={bellIconRef} size={18} />
      {unreadCount !== undefined && unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
