"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentMember } from "@/hooks/use-current-member";
import {
  type Notification,
  useMarkNotificationsRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { NotificationBell } from "./notification-bell";

export function NotificationDropdown() {
  const { member } = useCurrentMember();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications } = useNotifications({ limit: 10 });
  const markAsReadMutation = useMarkNotificationsRead();

  if (!member) return null;

  const handleNotificationClick = async (notificationId: string, read: boolean) => {
    if (!read) {
      await markAsReadMutation.mutateAsync({ notificationIds: [notificationId] });
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    if (notifications) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await markAsReadMutation.mutateAsync({ notificationIds: unreadIds });
      }
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.type === "comment_report") {
      return "/admin/reported-comments";
    }

    const postIdentifier = notification.postSlug || notification.postId;

    if (!postIdentifier) {
      return "/";
    }

    if (notification.entityType === "post") {
      return `/posts/${postIdentifier}`;
    }
    if (notification.entityType === "comment") {
      return `/posts/${postIdentifier}#comment-${notification.entityId}`;
    }

    return "/";
  };

  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <div>
          <NotificationBell onClick={() => setIsOpen(!isOpen)} />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>

          {notifications?.some((n) => !n.read) && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleMarkAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>

        <DropdownMenuSeparator />

        {!notifications || notifications.length === 0 ? (
          <div className="text-muted-foreground px-4 py-8 text-center text-sm">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="p-0"
                onClick={() => handleNotificationClick(notification.id, notification.read)}
              >
                <Link
                  href={getNotificationLink(notification)}
                  className="hover:bg-accent flex w-full items-start gap-3 rounded-none p-3"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {notification.actor?.firstName?.[0] || "U"}
                      {notification.actor?.lastName?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-foreground text-sm leading-tight">
                        {notification.message}
                      </p>

                      {!notification.read && (
                        <Badge
                          variant="secondary"
                          className="h-2 w-2 rounded-full bg-blue-500 p-0"
                        />
                      )}
                    </div>

                    <p className="text-muted-foreground mt-1 text-xs">
                      {getTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
