import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { members } from "./members";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    description: text("description"),

    // Customization
    icon: varchar("icon", { length: 50 }),
    bannerImage: text("banner_image"),
    rules: text("rules"),

    // Metrics
    postCount: integer("post_count").notNull().default(0),

    // Status
    status: varchar("status", { length: 20 }).notNull().default("active"),

    // Creator
    creatorId: uuid("creator_id").references(() => members.id),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("categories_name_idx").on(table.name),
    index("categories_status_idx").on(table.status),
    index("categories_post_count_idx").on(table.postCount),
  ],
);
