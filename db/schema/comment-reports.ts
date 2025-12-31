import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	index,
	unique,
} from "drizzle-orm/pg-core";
import { members } from "./members";
import { comments } from "./comments";

export const commentReports = pgTable(
	"comment_reports",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		commentId: uuid("comment_id")
			.notNull()
			.references(() => comments.id, { onDelete: "cascade" }),
		reporterId: uuid("reporter_id")
			.notNull()
			.references(() => members.id),
		reason: varchar("reason", { length: 50 }).notNull(), // 'spam' | 'inappropriate' | 'harassment' | 'other'
		reasonText: text("reason_text"),
		status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'resolved' | 'dismissed'
		resolvedBy: uuid("resolved_by").references(() => members.id),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		resolvedAt: timestamp("resolved_at"),
	},
	(table) => [
		index("comment_reports_comment_id_idx").on(table.commentId),
		index("comment_reports_status_idx").on(table.status),
		unique("comment_reports_reporter_comment_unique").on(
			table.reporterId,
			table.commentId,
		),
	],
);
