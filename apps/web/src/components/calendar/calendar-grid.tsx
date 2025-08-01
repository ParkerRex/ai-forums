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
 * - Event loading and display with real-time updates
 * - Month navigation with smooth transitions
 * - Event filtering and grouping by date
 * - Interactive date selection and event clicking
 * - Animated event cards with staggered loading
 * - Overflow handling for dates with many events
 * - Responsive design for all screen sizes
 *
 * Technical Implementation:
 * - Uses Convex queries for real-time event data
 * - Implements proper date arithmetic for calendar layout
 * - Handles month boundaries and leap years correctly
 * - Provides smooth animations using Framer Motion
 * - Optimized for performance with efficient re-renders
 *
 * @author VAI Team
 * @version 1.0.0
 * @since 2024
 */

"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Doc } from "@/web/convex/_generated/dataModel";
import { EventCard } from "./event-card";
import { Button } from "../components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
export function CalendarGrid({
  selectedDate,
  onDateSelect,
  onEventSelect,
}: CalendarGridProps) {
  // State for tracking the currently displayed month
  // Independent of selectedDate to allow navigation without changing selection
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch events for the current month using Convex query
  // This provides real-time updates when events are created/modified
  const events = useQuery(api.events.getEventsByMonth, {
    year: currentMonth.getFullYear(),
    month: currentMonth.getMonth(),
  });

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
  const getEventsForDate = (date: Date) => {
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth("prev")}
        >
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth("next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid container */}
      <div className="bg-muted/30 grid grid-cols-7 gap-1 rounded-none p-4">
        {/* Day headers (Sun, Mon, Tue, etc.) */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-muted-foreground p-2 text-center text-sm font-medium"
          >
            {day}
          </div>
        ))}

        {/* Calendar date cells */}
        {/* Generate 42 cells (6 rows × 7 days) to always show complete weeks */}
        {Array.from({ length: 42 }, (_, i) => {
          // Calculate the date for this cell
          // Start from the first day of the month
          const firstDay = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            1,
          );
          const startDate = new Date(firstDay);
          // Adjust to show previous month's trailing days
          startDate.setDate(startDate.getDate() - firstDay.getDay() + i);

          // Calculate display states for this date
          const isCurrentMonth =
            startDate.getMonth() === currentMonth.getMonth();
          const isToday =
            startDate.toDateString() === new Date().toDateString();
          const isSelected =
            startDate.toDateString() === selectedDate.toDateString();
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
              <div className="mb-1 text-sm font-medium">
                {startDate.getDate()}
              </div>

              {/* Events for this date */}
              <div className="space-y-1">
                <AnimatePresence>
                  {/* Show up to 3 events with staggered animation */}
                  {dayEvents
                    .slice(0, 3)
                    .map((event: Doc<"events">, index: number) => (
                      <motion.div
                        key={event._id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <EventCard
                          event={event}
                          size="small"
                          onClick={() => onEventSelect(event._id)}
                        />
                      </motion.div>
                    ))}
                </AnimatePresence>

                {/* Show overflow indicator if more than 3 events */}
                {dayEvents.length > 3 && (
                  <div className="text-muted-foreground text-xs">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
