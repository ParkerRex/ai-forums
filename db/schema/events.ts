import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { members } from "./members";

export type EventLocation = {
  type: "online" | "in-person" | "hybrid";
  details?: string;
  platform?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
};

export type EventResource = {
  title: string;
  url: string;
};

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Basic info
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    // Timing
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    timezone: varchar("timezone", { length: 50 }).default("UTC"),

    // Type & location
    type: varchar("type", { length: 50 }).notNull().default("community_call"), // 'community_call' | 'watch_party' | 'workshop' | 'meetup' | 'other'
    location: jsonb("location").$type<EventLocation>(),

    // Management
    createdBy: uuid("created_by")
      .notNull()
      .references(() => members.id),
    maxAttendees: integer("max_attendees"),
    requiresRSVP: boolean("requires_rsvp").notNull().default(false),

    // Attendees
    attendees: jsonb("attendees").$type<string[]>().default([]),
    waitlist: jsonb("waitlist").$type<string[]>().default([]),

    // Status
    status: varchar("status", { length: 20 }).notNull().default("upcoming"), // 'upcoming' | 'live' | 'completed' | 'cancelled'

    // Integrations
    googleCalendarId: text("google_calendar_id"),
    discordEventId: text("discord_event_id"),
    streamUrl: text("stream_url"),
    recordingUrl: text("recording_url"),

    // Resources
    resources: jsonb("resources").$type<EventResource[]>().default([]),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("events_start_time_idx").on(table.startTime),
    index("events_created_by_idx").on(table.createdBy),
    index("events_status_idx").on(table.status),
    index("events_type_idx").on(table.type),
    index("events_start_time_status_idx").on(table.startTime, table.status),
  ],
);
