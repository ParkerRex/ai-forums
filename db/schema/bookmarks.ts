import { index, jsonb, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { members } from "./members";

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    targetId: uuid("target_id").notNull(),
    targetType: varchar("target_type", { length: 20 }).notNull(), // 'post' | 'resource'
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("bookmarks_member_id_idx").on(table.memberId),
    index("bookmarks_target_id_idx").on(table.targetId),
    index("bookmarks_member_type_idx").on(table.memberId, table.targetType),
    index("bookmarks_member_created_at_idx").on(table.memberId, table.createdAt),
    unique("bookmarks_member_target_unique").on(table.memberId, table.targetId, table.targetType),
  ],
);
