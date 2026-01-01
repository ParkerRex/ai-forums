import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { members } from "./members";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => members.id),
    type: varchar("type", { length: 50 }).notNull(), // 'mention' | 'reply' | 'upvote' | 'follow' | 'comment_report' | 'payment_reminder'
    entityType: varchar("entity_type", { length: 20 }), // 'post' | 'comment'
    entityId: uuid("entity_id"),
    message: text("message"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("notifications_recipient_id_idx").on(table.recipientId),
    index("notifications_recipient_read_idx").on(table.recipientId, table.read),
    index("notifications_created_at_idx").on(table.createdAt),
  ],
);
