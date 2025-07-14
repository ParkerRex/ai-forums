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

/**
 * NotificationData Interface
 *
 * Defines the complete structure of notification objects returned from the Convex database.
 * This interface includes all notification metadata, actor information, and fields needed
 * for proper link construction and display formatting.
 *
 * Key Properties:
 * - Core notification data (id, type, message, read status)
 * - Actor information for displaying who triggered the notification
 * - Entity references for linking to the relevant content
 * - Computed fields like timeAgo for user-friendly display
 * - Optional postId and postSlug for flexible link generation
 */
interface NotificationData {
  // Unique identifier for the notification record in Convex
  _id: Id<"notifications">;

  // Timestamp when the notification was created in the database
  _creationTime: number;

  // ID of the member who should receive this notification
  recipientId: Id<"members">;

  // Type of notification - determines icon, message format, and behavior
  type:
    | "mention"
    | "reply"
    | "upvote"
    | "follow"
    | "comment_report"
    | "payment_reminder";

  // Type of entity that triggered the notification (post, comment, or payment)
  entityType: "post" | "comment" | "payment";

  // String ID of the specific entity (post ID, comment ID, etc.)
  entityId: string;

  // ID of the member who performed the action that triggered the notification
  actorId: Id<"members">;

  // Human-readable message describing the notification action
  message: string;

  // Whether the recipient has read this notification (affects styling)
  read: boolean;

  // Timestamp when the notification was originally created
  createdAt: number;

  // Populated actor information for display purposes (can be null if actor deleted)
  actor: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    slug: string;
  } | null;

  // Human-friendly relative time string (e.g., "2 hours ago")
  timeAgo: string;

  // Optional post ID for direct linking to posts (used as fallback)
  postId: Id<"posts"> | null;

  // Optional post slug for SEO-friendly URLs (preferred over postId)
  postSlug: string | null;
}

/**
 * NotificationDropdown Component
 *
 * A comprehensive notification system component that displays a dropdown menu
 * with the user's recent notifications. Features real-time updates, read/unread
 * status management, and intelligent linking to relevant content.
 *
 * Key Features:
 * - Real-time notification fetching via Convex queries
 * - Visual indicators for unread notifications (blue badge)
 * - Bulk "mark all as read" functionality for user convenience
 * - Smart link generation based on notification type and available data
 * - Responsive design with scrollable notification list
 * - Avatar display for notification actors with fallback initials
 * - Automatic dropdown closing after notification interaction
 *
 * User Experience Flow:
 * 1. User clicks notification bell to open dropdown
 * 2. Unread notifications show blue indicator badge
 * 3. Clicking notification marks it as read and navigates to content
 * 4. Users can mark all notifications as read with single button
 * 5. Empty state shown when no notifications exist
 *
 * @returns {JSX.Element | null} The notification dropdown or null if user not authenticated
 */
export function NotificationDropdown() {
  // Get current authenticated member information
  // This determines whether to show notifications and provides recipient context
  const { member } = useCurrentMember();

  // Control dropdown open/closed state for user interaction
  // Managed locally to provide immediate UI feedback
  const [isOpen, setIsOpen] = useState(false);

  // Fetch recent notifications for the current member
  // Limited to 10 most recent to prevent performance issues
  // Skips query if no member is authenticated
  const notifications = useQuery(
    api.notifications.getNotifications,
    member ? { limit: 10 } : "skip",
  );

  // Mutation to mark individual notifications as read
  // Called when user clicks on a specific notification
  const markAsRead = useMutation(api.notifications.markNotificationAsRead);

  // Mutation to mark all notifications as read at once
  // Provides bulk action for user convenience
  const markAllAsRead = useMutation(
    api.notifications.markAllNotificationsAsRead,
  );

  // Early return if user is not authenticated
  // Prevents showing notifications to unauthenticated users
  if (!member) return null;

  /**
   * Handle Individual Notification Click
   *
   * Processes user interaction with a specific notification item.
   * Marks unread notifications as read and closes the dropdown for navigation.
   * This function ensures proper state management and user experience flow.
   *
   * @param {string} notificationId - The unique ID of the clicked notification
   * @param {boolean} read - Current read status to avoid unnecessary API calls
   * @returns {Promise<void>} Async function that handles the click interaction
   */
  const handleNotificationClick = async (
    notificationId: string,
    read: boolean,
  ) => {
    // Only mark as read if currently unread to avoid unnecessary database writes
    if (!read) {
      await markAsRead({
        notificationId: notificationId as Id<"notifications">,
      });
    }

    // Close dropdown to allow navigation to the linked content
    // This provides a clean user experience transition
    setIsOpen(false);
  };

  /**
   * Handle Mark All Notifications as Read
   *
   * Bulk action to mark all notifications as read for the current user.
   * This provides a convenient way for users to clear their notification state
   * without having to click through each individual notification.
   *
   * @returns {Promise<void>} Async function that marks all notifications as read
   */
  const handleMarkAllAsRead = async () => {
    // Call Convex mutation to update all notifications for current user
    await markAllAsRead({});
  };

  /**
   * Generate Notification Link
   *
   * Creates appropriate navigation links based on notification type and available data.
   * This function handles different notification types and gracefully falls back
   * when specific data is unavailable.
   *
   * Link Generation Logic:
   * - comment_report: Always links to admin reported comments page
   * - post notifications: Links to post using slug (preferred) or ID (fallback)
   * - comment notifications: Links to post with comment anchor for direct navigation
   * - Default: Links to home page if no specific target can be determined
   *
   * @param {NotificationData} notification - The notification object containing link data
   * @returns {string} The appropriate URL path for navigation
   */
  const getNotificationLink = (notification: NotificationData) => {
    // Special case: comment reports always go to admin page
    if (notification.type === "comment_report") {
      return "/admin/reported-comments";
    }

    // Use SEO-friendly slug if available, otherwise fall back to database ID
    // This provides better URLs while maintaining functionality for older notifications
    const postIdentifier = notification.postSlug || notification.postId;

    // If no post identifier is available, default to home page
    // This prevents broken links and provides graceful degradation
    if (!postIdentifier) {
      return "/";
    }

    // Direct link to post for post-related notifications
    if (notification.entityType === "post") {
      return `/posts/${postIdentifier}`;
    }
    // Link to specific comment within post using anchor fragment
    else if (notification.entityType === "comment") {
      return `/posts/${postIdentifier}#comment-${notification.entityId}`;
    }

    // Fallback to home page for unknown entity types
    return "/";
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {/* Notification Bell Trigger - wrapped in div for proper event handling */}
      <DropdownMenuTrigger asChild>
        <div>
          <NotificationBell onClick={() => setIsOpen(!isOpen)} />
        </div>
      </DropdownMenuTrigger>

      {/* Main dropdown content with fixed width for consistent layout */}
      <DropdownMenuContent align="end" className="w-80">
        {/* Header section with title and bulk action button */}
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>

          {/* Show "Mark all read" button only when unread notifications exist */}
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

        {/* Empty state when no notifications exist */}
        {!notifications || notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            No notifications yet
          </div>
        ) : (
          /* Scrollable notification list with max height to prevent overflow */
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification: NotificationData) => (
              <DropdownMenuItem
                key={notification._id}
                className="p-0"
                onClick={() =>
                  handleNotificationClick(notification._id, notification.read)
                }
              >
                {/* Link wrapper for navigation - styled as full-width interactive area */}
                <Link
                  href={getNotificationLink(notification)}
                  className="flex items-start gap-3 p-3 w-full hover:bg-accent rounded-sm"
                >
                  {/* Actor avatar with fallback to initials */}
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {/* Display first letter of first and last name, fallback to "U" */}
                      {notification.actor?.firstName?.[0] || "U"}
                      {notification.actor?.lastName?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>

                  {/* Notification content area with message and timestamp */}
                  <div className="flex-1 min-w-0">
                    {/* Message and unread indicator row */}
                    <div className="flex items-start justify-between gap-2">
                      {/* Notification message text with proper line height */}
                      <p className="text-sm text-foreground leading-tight">
                        {notification.message}
                      </p>

                      {/* Blue dot indicator for unread notifications */}
                      {!notification.read && (
                        <Badge
                          variant="secondary"
                          className="h-2 w-2 rounded-full p-0 bg-blue-500"
                        />
                      )}
                    </div>

                    {/* Relative timestamp for user-friendly time display */}
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
