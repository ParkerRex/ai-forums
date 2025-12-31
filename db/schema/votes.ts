import {
	pgTable,
	uuid,
	varchar,
	timestamp,
	index,
	unique,
} from "drizzle-orm/pg-core";
import { members } from "./members";

export const votes = pgTable(
	"votes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => members.id, { onDelete: "cascade" }),
		targetId: uuid("target_id").notNull(),
		targetType: varchar("target_type", { length: 20 }).notNull(), // 'post' | 'comment' | 'resource'
		voteType: varchar("vote_type", { length: 20 }).notNull(), // 'upvote' | 'downvote'
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		index("votes_user_id_idx").on(table.userId),
		index("votes_target_id_idx").on(table.targetId),
		index("votes_target_type_idx").on(table.targetType),
		unique("votes_user_target_unique").on(
			table.userId,
			table.targetId,
			table.targetType,
		),
	],
);
