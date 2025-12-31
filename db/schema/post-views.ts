import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	index,
} from "drizzle-orm/pg-core";
import { members } from "./members";
import { posts } from "./posts";

export const postViews = pgTable(
	"post_views",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		userId: uuid("user_id").references(() => members.id),
		viewedAt: timestamp("viewed_at").notNull().defaultNow(),
		ipAddress: varchar("ip_address", { length: 45 }),
		userAgent: text("user_agent"),
	},
	(table) => [
		index("post_views_post_id_idx").on(table.postId),
		index("post_views_user_id_idx").on(table.userId),
		index("post_views_post_user_idx").on(table.postId, table.userId),
		index("post_views_viewed_at_idx").on(table.viewedAt),
	],
);
