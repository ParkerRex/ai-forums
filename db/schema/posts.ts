import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	integer,
	boolean,
	jsonb,
	index,
	real,
} from "drizzle-orm/pg-core";
import { members } from "./members";
import { categories } from "./categories";

export type PostAttachment = {
	id: string;
	type: "image" | "video" | "pdf" | "youtube";
	url: string;
	thumbnailUrl?: string;
	width?: number;
	height?: number;
	aspectRatio?: number;
	pageCount?: number;
	youTubeVideoId?: string;
	order: number;
};

export type LinkPreview = {
	url: string;
	title?: string;
	description?: string;
	image?: string;
	siteName?: string;
};

export type PollOption = {
	id: string;
	text: string;
	votes: number;
};

export const posts = pgTable(
	"posts",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		// Content
		title: varchar("title", { length: 255 }).notNull(),
		content: text("content").notNull(),
		slug: varchar("slug", { length: 255 }).notNull().unique(),
		preview: text("preview"),

		// References
		memberId: uuid("member_id")
			.notNull()
			.references(() => members.id),
		categoryId: uuid("category_id")
			.notNull()
			.references(() => categories.id),

		// Type & Media
		type: varchar("type", { length: 20 }).notNull().default("text"),
		mediaUrl: text("media_url"),
		thumbnailUrl: text("thumbnail_url"),
		aspectRatio: real("aspect_ratio"),
		mediaWidth: integer("media_width"),
		mediaHeight: integer("media_height"),

		// Attachments
		attachments: jsonb("attachments").$type<PostAttachment[]>().default([]),

		// Links
		linkUrl: text("link_url"),
		linkTitle: varchar("link_title", { length: 255 }),
		linkDescription: text("link_description"),
		linkImage: text("link_image"),
		linkPreviews: jsonb("link_previews").$type<LinkPreview[]>().default([]),

		// Polls
		pollOptions: jsonb("poll_options").$type<PollOption[]>(),
		pollEndsAt: timestamp("poll_ends_at"),
		totalPollVotes: integer("total_poll_votes").default(0),

		// Engagement metrics
		upvotes: integer("upvotes").notNull().default(0),
		downvotes: integer("downvotes").notNull().default(0),
		netVotes: integer("net_votes").notNull().default(0),
		commentCount: integer("comment_count").notNull().default(0),
		viewCount: integer("view_count").notNull().default(0),

		// Mentions
		mentions: jsonb("mentions").$type<string[]>().default([]),

		// Status & moderation
		status: varchar("status", { length: 20 }).notNull().default("active"),
		isPinned: boolean("is_pinned").notNull().default(false),
		isLocked: boolean("is_locked").notNull().default(false),
		isFree: boolean("is_free").notNull().default(true),
		pinScope: varchar("pin_scope", { length: 20 }),
		pinnedAt: timestamp("pinned_at"),
		pinnedBy: uuid("pinned_by").references(() => members.id),

		// Timestamps
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
		editedAt: timestamp("edited_at"),
		editReason: text("edit_reason"),
	},
	(table) => [
		index("posts_member_id_idx").on(table.memberId),
		index("posts_category_id_idx").on(table.categoryId),
		index("posts_status_idx").on(table.status),
		index("posts_slug_idx").on(table.slug),
		index("posts_created_at_idx").on(table.createdAt),
		index("posts_net_votes_idx").on(table.netVotes),
		index("posts_category_created_at_idx").on(table.categoryId, table.createdAt),
		index("posts_category_net_votes_idx").on(table.categoryId, table.netVotes),
		index("posts_pinned_category_idx").on(table.isPinned, table.categoryId),
	],
);
