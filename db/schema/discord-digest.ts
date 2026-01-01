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

export type DiscordAuthor = {
  id: string;
  username: string;
  avatar?: string;
};

export type DiscordReaction = {
  emoji: string;
  count: number;
};

export const discordDigest = pgTable(
  "discord_digest",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: varchar("message_id", { length: 100 }).notNull().unique(),
    content: text("content").notNull(),
    author: jsonb("author").$type<DiscordAuthor>().notNull(),
    timestamp: timestamp("timestamp").notNull(),
    channelId: varchar("channel_id", { length: 100 }).notNull(),
    channelName: varchar("channel_name", { length: 100 }),
    reactions: jsonb("reactions").$type<DiscordReaction[]>().default([]),
    reactionScore: integer("reaction_score").notNull().default(0),
    summary: text("summary"),
    digestDate: timestamp("digest_date").notNull(),
    processedAt: timestamp("processed_at").notNull().defaultNow(),
  },
  (table) => [
    index("discord_digest_digest_date_idx").on(table.digestDate),
    index("discord_digest_reaction_score_idx").on(table.reactionScore),
    index("discord_digest_message_id_idx").on(table.messageId),
    index("discord_digest_processed_at_idx").on(table.processedAt),
  ],
);
