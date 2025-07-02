"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { format } from "date-fns";

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

interface EventCardProps {
  event: Event;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
}

const getEventTypeColorClass = (type: string) => {
  switch (type) {
    case "community_call":
      return "bg-primary";
    case "watch_party":
      return "bg-secondary";
    case "workshop":
      return "bg-accent";
    case "meetup":
      return "bg-destructive";
    default:
      return "bg-muted";
  }
};

const eventTypeIcons = {
  community_call: Calendar,
  watch_party: Users,
  workshop: Clock,
  meetup: MapPin,
  other: Calendar,
};

export function EventCard({ event, size = "medium", onClick }: EventCardProps) {
  const Icon = eventTypeIcons[event.type];
  const colorClass = getEventTypeColorClass(event.type);
  
  const startTime = new Date(event.startTime);
  const endTime = new Date(event.endTime);
  
  if (size === "small") {
    return (
      <motion.div
        className={`
          ${colorClass} text-primary-foreground text-xs p-1 rounded cursor-pointer
          hover:opacity-80 transition-opacity
        `}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="font-medium truncate">{event.title}</div>
        <div className="opacity-90">
          {format(startTime, "h:mm a")}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-3">
        <div className={`${colorClass} p-2 rounded-lg`}>
          <Icon className="w-4 h-4 text-primary-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{event.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {event.description}
          </p>
          
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
            </div>
            
            {event.requiresRSVP && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {event.attendees.length}
                {event.maxAttendees && `/${event.maxAttendees}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
