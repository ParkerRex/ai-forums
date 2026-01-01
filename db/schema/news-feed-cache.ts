import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { members } from "./members";

export type NewsFeedArticle = {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source?: string;
  imageUrl?: string;
};

export type NewsFeedSource = {
  type: "github" | "rss" | "discord";
  url?: string;
  name: string;
  guildId?: string;
  channelIds?: string[];
};

export const newsFeedCache = pgTable(
  "news_feed_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => members.id),
    cacheKey: text("cache_key").notNull().unique(),
    articles: jsonb("articles").$type<NewsFeedArticle[]>().default([]),
    sources: jsonb("sources").$type<NewsFeedSource[]>().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [
    index("news_feed_cache_cache_key_idx").on(table.cacheKey),
    index("news_feed_cache_user_created_at_idx").on(table.userId, table.createdAt),
    index("news_feed_cache_created_at_idx").on(table.createdAt),
  ],
);
