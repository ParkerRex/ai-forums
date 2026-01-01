import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Profile
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),

    // Auth
    passwordHash: text("password_hash"),
    authMethod: varchar("auth_method", { length: 20 }).default("password"),

    // Social links
    websiteUrl: text("website_url"),
    linkedinUrl: text("linkedin_url"),
    linkGithub: text("link_github"),
    linkX: text("link_x"),
    linkYouTube: text("link_youtube"),

    // Location
    country: varchar("country", { length: 100 }),
    location: varchar("location", { length: 255 }),

    // Skills
    skills: jsonb("skills").$type<string[]>().default([]),

    // Status & role
    status: varchar("status", { length: 20 }).notNull().default("active"),
    role: varchar("role", { length: 20 }).notNull().default("user"),

    // Cached metrics
    postCount: integer("post_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    netVoteCount: integer("net_vote_count").notNull().default(0),

    // Timestamps
    joinedDate: timestamp("joined_date").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    lastOnline: timestamp("last_online").notNull().defaultNow(),

    // Preferences
    newsPreferences: jsonb("news_preferences"),
  },
  (table) => [
    index("members_email_idx").on(table.email),
    index("members_slug_idx").on(table.slug),
    index("members_status_idx").on(table.status),
    index("members_last_online_idx").on(table.lastOnline),
    index("members_joined_date_idx").on(table.joinedDate),
  ],
);
