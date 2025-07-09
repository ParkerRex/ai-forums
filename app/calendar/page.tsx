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
 * - Real-time event updates via Convex
 * - Responsive design for mobile and desktop
 * 
 * @author VAI Team
 * @version 1.0.0
 * @since 2024
 */

"use client";

import { useState } from "react";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { EventModal } from "@/components/calendar/event-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Authenticated, Unauthenticated } from "convex/react";
import { MembershipCTAModal } from "@/components/membership-cta-modal";

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
        
        {/* Membership CTA for unauthenticated users */}
        {/* Shows same button but opens membership modal instead of event creation */}
        <Unauthenticated>
          <MembershipCTAModal
            title="Create Community Events"
            description="Join VAI to create and manage community events"
          >
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </MembershipCTAModal>
        </Unauthenticated>
      </div>

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
