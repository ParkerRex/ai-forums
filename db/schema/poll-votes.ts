import { index, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { members } from "./members";
import { posts } from "./posts";

export const pollVotes = pgTable(
  "poll_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    optionId: varchar("option_id", { length: 100 }).notNull(),
    votedAt: timestamp("voted_at").notNull().defaultNow(),
  },
  (table) => [
    index("poll_votes_poll_id_idx").on(table.pollId),
    unique("poll_votes_user_poll_unique").on(table.userId, table.pollId),
  ],
);
