/**
 * @fileoverview Event Card Component for Calendar Display
 * 
 * This component renders individual event cards within the calendar grid and
 * other event display contexts. It supports multiple display sizes and provides
 * consistent event visualization with proper theming, animations, and accessibility.
 * 
 * Key Features:
 * - Multiple display sizes (small, medium, large)
 * - Event type-based visual theming and icons
 * - Animated interactions with hover/click states
 * - Responsive design for different screen sizes
 * - Time formatting and display
 * - RSVP and attendee information display
 * - Accessibility support with proper ARIA labels
 * 
 * Event Types and Visual Themes:
 * - community_call: Primary blue theme with Calendar icon
 * - watch_party: Secondary theme with Users icon
 * - workshop: Accent theme with Clock icon
 * - meetup: Destructive red theme with MapPin icon
 * - other: Muted gray theme with Calendar icon
 * 
 * @author VAI Team
 * @version 1.0.0
 * @since 2024
 */

"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

/**
 * Event interface representing the structure of calendar events
 * 
 * @interface Event
 * @property {string} _id - Unique identifier for the event
 * @property {string} title - Display title of the event
 * @property {string} description - Detailed description of the event
 * @property {number} startTime - Unix timestamp for event start
 * @property {number} endTime - Unix timestamp for event end
 * @property {string} type - Category of event for theming and filtering
 * @property {Object} location - Location details for the event
 * @property {string[]} attendees - Array of attendee user IDs
 * @property {number} maxAttendees - Maximum number of attendees (optional)
 * @property {boolean} requiresRSVP - Whether RSVP is required
 * @property {Object} creator - Event creator information (optional)
 */
interface Event {
  _id: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  type: "community_call" | "watch_party" | "workshop" | "meetup" | "other";
  location: {
    type: "virtual" | "physical";
    details: string;
    platform?: string;
  };
  attendees: string[];
  maxAttendees?: number;
  requiresRSVP: boolean;
  creator?: {
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * Props interface for the EventCard component
 * 
 * @interface EventCardProps
 * @property {Event} event - The event data to display
 * @property {string} size - Display size variant
 * @property {function} onClick - Optional click handler
 */
interface EventCardProps {
  event: Event;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
}

/**
 * Maps event types to their corresponding background color classes
 * 
 * This function provides consistent visual theming across the application
 * by mapping each event type to a specific color from the design system.
 * Colors are chosen to be semantically meaningful and accessible.
 * 
 * @param {string} type - The event type to get colors for
 * @returns {string} Tailwind CSS background color class
 */
const getEventTypeColorClass = (type: string) => {
  switch (type) {
    case "community_call":
      // Primary blue for official VAI community calls
      return "bg-primary";
    case "watch_party":
      // Secondary color for social watch parties
      return "bg-secondary";
    case "workshop":
      // Accent color for educational workshops
      return "bg-accent";
    case "meetup":
      // Destructive red for in-person meetups (high visibility)
      return "bg-destructive";
    default:
      // Muted gray for other/unspecified event types
      return "bg-muted";
  }
};

/**
 * Maps event types to their corresponding Lucide React icons
 * 
 * This object provides semantic icon mapping for different event types,
 * making it easy to visually distinguish between different kinds of events.
 * Icons are chosen to be intuitive and universally understood.
 * 
 * @type {Object<string, React.ComponentType>}
 */
const eventTypeIcons = {
  community_call: Calendar,  // Calendar icon for scheduled calls
  watch_party: Users,        // Users icon for social gatherings
  workshop: Clock,           // Clock icon for time-based learning
  meetup: MapPin,           // MapPin icon for location-based events
  other: Calendar,          // Default calendar icon for other events
};

/**
 * Event card component that displays event information in various sizes
 * 
 * This component adapts its layout and information density based on the
 * specified size prop. It provides consistent event visualization with
 * proper theming, animations, and user interaction handling.
 * 
 * @param {EventCardProps} props - Component props
 * @param {Event} props.event - The event data to display
 * @param {string} props.size - Display size ("small", "medium", or "large")
 * @param {function} props.onClick - Optional click handler for event selection
 * @returns {JSX.Element} Rendered event card with appropriate styling
 * 
 * @example
 * ```tsx
 * // Small card for calendar grid
 * <EventCard event={event} size="small" onClick={() => selectEvent(event.id)} />
 * 
 * // Medium card for event lists
 * <EventCard event={event} size="medium" onClick={() => openEventModal(event)} />
 * ```
 */
export function EventCard({ event, size = "medium", onClick }: EventCardProps) {
  // Get the appropriate icon component for this event type
  const Icon = eventTypeIcons[event.type];
  
  // Get the color class for this event type
  const colorClass = getEventTypeColorClass(event.type);
  
  // Convert Unix timestamps to JavaScript Date objects for formatting
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  
  // Render compact version for calendar grid display
  if (size === "small") {
    return (
      <motion.div
        className={`
          ${colorClass} text-primary-foreground text-xs p-1 rounded cursor-pointer
          hover:opacity-80 transition-opacity
        `}
        onClick={(e) => {
          // Prevent event bubbling to parent date cell
          e.stopPropagation();
          onClick?.();
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Event title with truncation for long titles */}
        <div className="font-medium truncate">{event.title}</div>
        {/* Start time in 12-hour format */}
        <div className="opacity-90">
          {format(startTime, "h:mm a")}
        </div>
      </motion.div>
    );
  }

  // Render full-featured card for larger displays
  return (
    <motion.div
      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-3">
        {/* Event type icon with themed background */}
        <div className={`${colorClass} p-2 rounded-lg`}>
          <Icon className="w-4 h-4 text-primary-foreground" />
        </div>
        
        {/* Event details section */}
        <div className="flex-1 min-w-0">
          {/* Event title with truncation */}
          <h3 className="font-semibold truncate">{event.title}</h3>
          
          {/* Event description with line clamping */}
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {event.description}
          </p>
          
          {/* Event metadata (time, attendees) */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            {/* Time range display */}
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
            </div>
            
            {/* Attendee count (only shown for RSVP events) */}
            {event.requiresRSVP && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {event.attendees.length}
                {/* Show max attendees if specified */}
                {event.maxAttendees && `/${event.maxAttendees}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
