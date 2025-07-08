"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentMember } from "@/hooks/use-current-member";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "./notification-bell";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

interface NotificationData {
  _id: Id<"notifications">;
  _creationTime: number;
  recipientId: Id<"members">;
  type: "mention" | "reply" | "upvote" | "follow" | "comment_report" | "payment_reminder";
  entityType: "post" | "comment" | "payment";
  entityId: string;
  actorId: Id<"members">;
  message: string;
  read: boolean;
  createdAt: number;
  actor: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    slug: string;
  } | null;
  timeAgo: string;
  // Additional fields for link construction
  postId: Id<"posts"> | null;
  postSlug: string | null;
}

export function NotificationDropdown() {
  const { member } = useCurrentMember();
  const [isOpen, setIsOpen] = useState(false);

  const notifications = useQuery(
    api.notifications.getNotifications,
    member ? { limit: 10 } : "skip",
  );

  const markAsRead = useMutation(api.notifications.markNotificationAsRead);
  const markAllAsRead = useMutation(
    api.notifications.markAllNotificationsAsRead,
  );

  if (!member) return null;

  const handleNotificationClick = async (
    notificationId: string,
    read: boolean,
  ) => {
    if (!read) {
      await markAsRead({
        notificationId: notificationId as Id<"notifications">,
      });
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead({});
  };

  const getNotificationLink = (notification: NotificationData) => {
    if (notification.type === "comment_report") {
      return "/admin/reported-comments";
    }

    // Use postSlug if available, otherwise fall back to postId
    const postIdentifier = notification.postSlug || notification.postId;

    if (!postIdentifier) {
      return "/";
    }

    if (notification.entityType === "post") {
      return `/posts/${postIdentifier}`;
    } else if (notification.entityType === "comment") {
      return `/posts/${postIdentifier}#comment-${notification.entityId}`;
    }
    return "/";
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
          {notifications &&
            notifications.some((n: NotificationData) => !n.read) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </Button>
            )}
        </div>
        <DropdownMenuSeparator />

        {!notifications || notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification: NotificationData) => (
              <DropdownMenuItem
                key={notification._id}
                className="p-0"
                onClick={() =>
                  handleNotificationClick(notification._id, notification.read)
                }
              >
                <Link
                  href={getNotificationLink(notification)}
                  className="flex items-start gap-3 p-3 w-full hover:bg-accent rounded-sm"
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {notification.actor?.firstName?.[0] || "U"}
                      {notification.actor?.lastName?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-foreground leading-tight">
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <Badge
                          variant="secondary"
                          className="h-2 w-2 rounded-full p-0 bg-blue-500"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.timeAgo}
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
