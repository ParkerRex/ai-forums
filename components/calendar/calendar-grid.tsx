/**
 * @fileoverview Interactive Calendar Grid Component
 *
 * This component renders a full-featured monthly calendar grid with event
 * visualization, navigation, and interaction capabilities. It's the core
 * calendar interface that displays events in a traditional calendar layout
 * with smooth animations and responsive design.
 *
 * Key Features:
 * - Monthly calendar grid with proper date calculations
 * - Event loading and display with React Query
 * - Month navigation with smooth transitions
 * - Event filtering and grouping by date
 * - Interactive date selection and event clicking
 * - Animated event cards with staggered loading
 * - Overflow handling for dates with many events
 * - Responsive design for all screen sizes
 *
 * Technical Implementation:
 * - Uses React Query for event data fetching
 * - Implements proper date arithmetic for calendar layout
 * - Handles month boundaries and leap years correctly
 * - Provides smooth animations using Framer Motion
 * - Optimized for performance with efficient re-renders
 *
 * @author VAI Team
 * @version 2.0.0
 * @since 2024
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type Event, useEventsByMonth } from "@/hooks/use-events";
import { EventCard } from "./event-card";

/**
 * Props interface for the CalendarGrid component
 *
 * @interface CalendarGridProps
 * @property {Date} selectedDate - Currently selected date for highlighting
 * @property {function} onDateSelect - Callback fired when a date is clicked
 * @property {function} onEventSelect - Callback fired when an event is clicked
 */
interface CalendarGridProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onEventSelect: (eventId: string) => void;
}

/**
 * Interactive calendar grid component that displays events in a monthly view
 *
 * This component handles the complex logic of calendar layout generation,
 * event data fetching, and user interactions. It provides a clean interface
 * for navigating between months and viewing/selecting events.
 *
 * @param {CalendarGridProps} props - Component props
 * @param {Date} props.selectedDate - Currently selected date
 * @param {function} props.onDateSelect - Called when user clicks a date
 * @param {function} props.onEventSelect - Called when user clicks an event
 * @returns {JSX.Element} The calendar grid with navigation and events
 *
 * @example
 * ```tsx
 * <CalendarGrid
 *   selectedDate={selectedDate}
 *   onDateSelect={setSelectedDate}
 *   onEventSelect={setSelectedEventId}
 * />
 * ```
 */
export function CalendarGrid({ selectedDate, onDateSelect, onEventSelect }: CalendarGridProps) {
  // State for tracking the currently displayed month
  // Independent of selectedDate to allow navigation without changing selection
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch events for the current month using React Query
  const { data: events, isLoading } = useEventsByMonth(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
  );

  /**
   * Navigates to the previous or next month
   *
   * This function handles month navigation by creating a new Date object
   * and updating the month. JavaScript's Date object automatically handles
   * year boundaries and leap years.
   *
   * @param {('prev' | 'next')} direction - Navigation direction
   */
  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    if (direction === "prev") {
      // Move to previous month (automatically handles year boundary)
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      // Move to next month (automatically handles year boundary)
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  /**
   * Filters events for a specific date
   *
   * This function creates a date range for the entire day (00:00:00 to 23:59:59)
   * and filters events that fall within that range. This handles events that
   * start on the given date regardless of their time.
   *
   * @param {Date} date - The date to filter events for
   * @returns {Array} Array of events occurring on the specified date
   */
  const getEventsForDate = (date: Date): Event[] => {
    if (!events) return [];

    // Create start of day (00:00:00.000)
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);

    // Create end of day (23:59:59.999)
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    // Filter events that start within this date range
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= dateStart && eventDate <= dateEnd;
    });
  };

  // Array of month names for display
  // Used to convert month index to readable format
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="space-y-6">
      {/* Month navigation header */}
      <div className="flex items-center justify-between">
        {/* Previous month button */}
        <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Month and year display with animation */}
        {/* Key prop forces re-render when month changes for smooth transitions */}
        <motion.h2
          key={`${currentMonth.getFullYear()}-${currentMonth.getMonth()}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold"
        >
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </motion.h2>

        {/* Next month button */}
        <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Calendar grid container */}
      <div className="bg-muted/30 grid grid-cols-7 gap-1 rounded-none p-4">
        {/* Day headers (Sun, Mon, Tue, etc.) */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-muted-foreground p-2 text-center text-sm font-medium">
            {day}
          </div>
        ))}

        {/* Calendar date cells */}
        {/* Generate 42 cells (6 rows x 7 days) to always show complete weeks */}
        {Array.from({ length: 42 }, (_, i) => {
          // Calculate the date for this cell
          // Start from the first day of the month
          const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          const startDate = new Date(firstDay);
          // Adjust to show previous month's trailing days
          startDate.setDate(startDate.getDate() - firstDay.getDay() + i);

          // Calculate display states for this date
          const isCurrentMonth = startDate.getMonth() === currentMonth.getMonth();
          const isToday = startDate.toDateString() === new Date().toDateString();
          const isSelected = startDate.toDateString() === selectedDate.toDateString();
          const dayEvents = getEventsForDate(startDate);

          return (
            <motion.div
              key={startDate.toISOString()}
              className={`border-border/50 hover:bg-muted/50 min-h-[100px] cursor-pointer border p-2 transition-colors ${!isCurrentMonth ? "text-muted-foreground bg-muted/20" : ""} ${isToday ? "bg-primary/10 border-primary/30" : ""} ${isSelected ? "ring-primary ring-2" : ""} `}
              onClick={() => onDateSelect(startDate)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Date number */}
              <div className="mb-1 text-sm font-medium">{startDate.getDate()}</div>

              {/* Events for this date */}
              <div className="space-y-1">
                <AnimatePresence>
                  {/* Show up to 3 events with staggered animation */}
                  {dayEvents.slice(0, 3).map((event: Event, index: number) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <EventCard
                        event={{
                          id: event.id,
                          title: event.title,
                          description: event.description || "",
                          startTime: event.startTime,
                          endTime: event.endTime || event.startTime + 3600000,
                          type: event.type as
                            | "community_call"
                            | "watch_party"
                            | "workshop"
                            | "meetup"
                            | "other",
                          location: {
                            type: event.location?.type === "in-person" ? "physical" : "virtual",
                            details: event.location?.details || "",
                            platform: event.location?.platform,
                          },
                          attendees: event.attendees || [],
                          maxAttendees: event.maxAttendees || undefined,
                          requiresRSVP: event.requiresRSVP,
                          creator: event.creator
                            ? {
                                firstName: event.creator.firstName,
                                lastName: event.creator.lastName,
                              }
                            : null,
                        }}
                        size="small"
                        onClick={() => onEventSelect(event.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Show overflow indicator if more than 3 events */}
                {dayEvents.length > 3 && (
                  <div className="text-muted-foreground text-xs">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
