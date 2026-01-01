import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { members } from "./members";
import { topics } from "./topics";

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Content
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    url: text("url").notNull(),

    // Classification
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id),
    type: varchar("type", { length: 20 }).notNull().default("article"), // 'article' | 'video' | 'course' | 'documentation' | 'tool' | 'book' | 'other'
    difficulty: varchar("difficulty", { length: 20 }), // 'beginner' | 'intermediate' | 'advanced'

    // Pricing
    isPaid: boolean("is_paid").notNull().default(false),
    isFree: boolean("is_free").notNull().default(true),

    // Engagement
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    netVotes: integer("net_votes").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),

    // Link preview
    linkTitle: varchar("link_title", { length: 255 }),
    linkDescription: text("link_description"),
    linkImage: text("link_image"),

    // Contributor
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id),

    // Status
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'active' | 'rejected' | 'outdated'

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("resources_topic_id_idx").on(table.topicId),
    index("resources_member_id_idx").on(table.memberId),
    index("resources_status_idx").on(table.status),
    index("resources_topic_votes_idx").on(table.topicId, table.netVotes),
    index("resources_topic_created_at_idx").on(table.topicId, table.createdAt),
  ],
);
