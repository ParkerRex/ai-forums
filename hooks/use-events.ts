"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Event location type
export type EventLocation = {
  type: "online" | "in-person" | "hybrid";
  details?: string;
  platform?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
};

// Event resource type
export type EventResource = {
  title: string;
  url: string;
};

// Event type
export type Event = {
  id: string;
  title: string;
  description: string | null;
  startTime: number;
  endTime: number | null;
  timezone: string | null;
  type: string;
  location: EventLocation | null;
  createdBy: string;
  maxAttendees: number | null;
  requiresRSVP: boolean;
  attendees: string[];
  waitlist: string[];
  status: string;
  googleCalendarId: string | null;
  discordEventId: string | null;
  streamUrl: string | null;
  recordingUrl: string | null;
  resources: EventResource[];
  createdAt: number;
  updatedAt: number;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
    avatarUrl: string | null;
  };
};

// Events response type
type EventsResponse = {
  items: Event[];
};

// Create event data type
type CreateEventData = {
  title: string;
  description?: string;
  startTime: number;
  endTime?: number;
  timezone?: string;
  type?: "community_call" | "watch_party" | "workshop" | "meetup" | "other";
  location?: EventLocation;
  maxAttendees?: number;
  requiresRSVP?: boolean;
  streamUrl?: string;
  resources?: EventResource[];
};

// Update event data type
type UpdateEventData = {
  eventId: string;
  title?: string;
  description?: string;
  startTime?: number;
  endTime?: number | null;
  timezone?: string;
  type?: "community_call" | "watch_party" | "workshop" | "meetup" | "other";
  location?: EventLocation;
  maxAttendees?: number | null;
  requiresRSVP?: boolean;
  streamUrl?: string | null;
  recordingUrl?: string | null;
  resources?: EventResource[];
  status?: "upcoming" | "live" | "completed" | "cancelled";
};

// RSVP response type
type RSVPResponse = {
  status: "attending" | "waitlisted" | "cancelled" | "not_attending";
  attendeeCount: number;
  waitlistCount: number;
  maxAttendees: number | null;
};

// Fetch events with optional filters
async function fetchEvents(params?: {
  year?: number;
  month?: number;
  status?: string;
  type?: string;
  limit?: number;
}): Promise<EventsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.year !== undefined) searchParams.set("year", params.year.toString());
  if (params?.month !== undefined) searchParams.set("month", params.month.toString());
  if (params?.status) searchParams.set("status", params.status);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const response = await fetch(`/api/events?${searchParams}`);
  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }
  return response.json();
}

// Fetch events by month (convenience function for calendar)
async function fetchEventsByMonth(year: number, month: number): Promise<Event[]> {
  const response = await fetchEvents({ year, month });
  return response.items;
}

// Fetch a single event
async function fetchEvent(eventId: string): Promise<Event | null> {
  const response = await fetch(`/api/events/${eventId}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Failed to fetch event");
  }
  return response.json();
}

// Create a new event
async function createEvent(data: CreateEventData): Promise<Event> {
  const response = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create event");
  }
  return response.json();
}

// Update an event
async function updateEvent(data: UpdateEventData): Promise<Event> {
  const { eventId, ...updateData } = data;
  const response = await fetch(`/api/events/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update event");
  }
  return response.json();
}

// Delete an event
async function deleteEvent(eventId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/events/${eventId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete event");
  }
  return response.json();
}

// RSVP to an event
async function rsvpToEvent(eventId: string, action: "rsvp" | "cancel"): Promise<RSVPResponse> {
  const response = await fetch(`/api/events/${eventId}/rsvp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to RSVP");
  }
  return response.json();
}

// Get RSVP status
async function getRsvpStatus(eventId: string): Promise<RSVPResponse> {
  const response = await fetch(`/api/events/${eventId}/rsvp`);
  if (!response.ok) {
    throw new Error("Failed to get RSVP status");
  }
  return response.json();
}

// Hook: Get events with optional filters
export function useEvents(options?: {
  year?: number;
  month?: number;
  status?: string;
  type?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["events", options],
    queryFn: () => fetchEvents(options),
  });
}

// Hook: Get events by month (for calendar view)
export function useEventsByMonth(year: number, month: number) {
  return useQuery({
    queryKey: ["events", "byMonth", year, month],
    queryFn: () => fetchEventsByMonth(year, month),
  });
}

// Hook: Get a single event by ID
export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId],
    queryFn: () => fetchEvent(eventId!),
    enabled: !!eventId,
  });
}

// Hook: Create an event
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// Hook: Update an event
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEvent,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// Hook: Delete an event
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// Hook: RSVP to an event
export function useRsvpToEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, action }: { eventId: string; action: "rsvp" | "cancel" }) =>
      rsvpToEvent(eventId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.eventId] });
      queryClient.invalidateQueries({
        queryKey: ["rsvpStatus", variables.eventId],
      });
    },
  });
}

// Hook: Get RSVP status
export function useRsvpStatus(eventId: string | undefined) {
  return useQuery({
    queryKey: ["rsvpStatus", eventId],
    queryFn: () => getRsvpStatus(eventId!),
    enabled: !!eventId,
  });
}
