/**
 * @fileoverview VAI Community Calendar Page
 *
 * This is the main calendar page for the VAI community, providing a comprehensive
 * view of all community events including watch parties, workshops, community calls,
 * and meetups. The page features a monthly calendar grid with event visualization,
 * event creation/editing capabilities, and role-based access control.
 *
 * Key Features:
 * - Monthly calendar grid view with event display
 * - Event creation and management (authenticated users only)
 * - Event details modal for viewing/editing events
 * - Authentication-gated functionality with membership CTA
 * - Event data fetched via React Query
 * - Responsive design for mobile and desktop
 *
 * @author VAI Team
 * @version 2.0.0
 * @since 2024
 */

"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Authenticated, Unauthenticated } from "@/components/auth-wrappers";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { EventModal } from "@/components/calendar/event-modal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Main calendar page component that renders the VAI community calendar
 *
 * This component manages the overall calendar state including selected dates,
 * modal visibility, and event selection. It provides different interfaces
 * for authenticated and unauthenticated users, with full calendar functionality
 * for members and membership prompts for non-members.
 *
 * @returns {JSX.Element} The complete calendar page with grid, modals, and controls
 *
 * @example
 * ```tsx
 * // Rendered at /calendar route
 * <CalendarPage />
 * ```
 */
export default function CalendarPage() {
  // State management for calendar interactions
  // Currently selected date (defaults to today for new event creation)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Controls visibility of the event creation modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Stores the ID of the selected event for viewing/editing
  // null when no event is selected
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header section with title, description, and action buttons */}
      <div className="flex items-center justify-between mb-8">
        {/* Page title and description */}
        <div>
          <h1 className="text-3xl font-bold">Community Calendar</h1>
          <p className="text-muted-foreground mt-2">
            Stay up to date with VAI community events, watch parties, and workshops
          </p>
        </div>

        {/* Create Event button - only visible to authenticated users */}
        <Authenticated>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </Authenticated>

        {/* Sign in CTA for unauthenticated users */}
        <Unauthenticated>
          <Button asChild>
            <Link href="/sign-in">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Link>
          </Button>
        </Unauthenticated>
      </div>

      {/* WIP Alert */}
      <Alert className="mb-6 border-[#00794c]/20 bg-[#00794c]/5">
        <AlertTitle>Work in Progress</AlertTitle>
        <AlertDescription>
          This calendar feature is currently under development. Track progress on{" "}
          <a
            href="https://github.com/joinvai/vai/issues/69"
            className="underline text-[#00794c] hover:text-[#00794c]/80"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Issue #69
          </a>
          .
        </AlertDescription>
      </Alert>

      {/* Main calendar grid component */}
      {/* Handles month navigation, date selection, and event display */}
      <CalendarGrid
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        onEventSelect={setSelectedEventId}
      />

      {/* Event creation modal */}
      {/* Opens when authenticated users click "Create Event" */}
      <EventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        selectedDate={selectedDate}
      />

      {/* Event viewing/editing modal */}
      {/* Opens when users click on an existing event in the calendar */}
      {selectedEventId && (
        <EventModal
          isOpen={!!selectedEventId}
          onClose={() => setSelectedEventId(null)}
          eventId={selectedEventId}
        />
      )}
    </div>
  );
}
