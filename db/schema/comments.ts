import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	integer,
	jsonb,
	index,
} from "drizzle-orm/pg-core";
import { members } from "./members";
import { posts } from "./posts";

export type CommentAttachment = {
	id: string;
	type: "image" | "document" | "gif";
	url: string;
	thumbnailUrl?: string;
	width?: number;
	height?: number;
	fileName?: string;
};

export type CommentEditHistory = {
	content: string;
	attachments?: CommentAttachment[];
	editedAt: string;
};

export type CommentLinkPreview = {
	url: string;
	title?: string;
	description?: string;
	image?: string;
};

export const comments = pgTable(
	"comments",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		// Content
		content: text("content").notNull(),

		// References
		memberId: uuid("member_id")
			.notNull()
			.references(() => members.id),
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),

		// Threading
		parentCommentId: uuid("parent_comment_id"),
		depth: integer("depth").notNull().default(0),
		childCount: integer("child_count").notNull().default(0),
		order: integer("order").notNull().default(0),

		// GitHub-style flat display
		replyToMemberId: uuid("reply_to_member_id").references(() => members.id),
		replyToCommentId: uuid("reply_to_comment_id"),

		// Engagement
		upvotes: integer("upvotes").notNull().default(0),
		downvotes: integer("downvotes").notNull().default(0),
		netVotes: integer("net_votes").notNull().default(0),

		// Attachments & links
		attachments: jsonb("attachments").$type<CommentAttachment[]>().default([]),
		linkPreviews: jsonb("link_previews")
			.$type<CommentLinkPreview[]>()
			.default([]),

		// Mentions
		mentions: jsonb("mentions").$type<string[]>().default([]),

		// Edit history
		editHistory: jsonb("edit_history").$type<CommentEditHistory[]>().default([]),

		// Status
		status: varchar("status", { length: 20 }).notNull().default("active"),

		// Timestamps
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
		editedAt: timestamp("edited_at"),
		editReason: text("edit_reason"),
	},
	(table) => [
		index("comments_post_id_idx").on(table.postId),
		index("comments_member_id_idx").on(table.memberId),
		index("comments_parent_comment_id_idx").on(table.parentCommentId),
		index("comments_status_idx").on(table.status),
		index("comments_post_created_at_idx").on(table.postId, table.createdAt),
		index("comments_post_net_votes_idx").on(table.postId, table.netVotes),
		index("comments_parent_order_idx").on(table.parentCommentId, table.order),
	],
);
