import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	integer,
	jsonb,
	real,
	index,
} from "drizzle-orm/pg-core";
import { members } from "./members";
import { posts, type PostAttachment } from "./posts";

export const postVersions = pgTable(
	"post_versions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		version: integer("version").notNull(),
		editorId: uuid("editor_id")
			.notNull()
			.references(() => members.id),

		// Content snapshot
		title: varchar("title", { length: 255 }).notNull(),
		content: text("content").notNull(),
		editReason: text("edit_reason"),

		// Media snapshot
		type: varchar("type", { length: 20 }),
		mediaUrl: text("media_url"),
		thumbnailUrl: text("thumbnail_url"),
		aspectRatio: real("aspect_ratio"),
		mediaWidth: integer("media_width"),
		mediaHeight: integer("media_height"),

		// Links snapshot
		linkUrl: text("link_url"),
		linkTitle: varchar("link_title", { length: 255 }),
		linkDescription: text("link_description"),
		linkImage: text("link_image"),

		// Attachments snapshot
		attachments: jsonb("attachments").$type<PostAttachment[]>().default([]),

		// Timestamp
		editedAt: timestamp("edited_at").notNull().defaultNow(),
	},
	(table) => [
		index("post_versions_post_id_idx").on(table.postId),
		index("post_versions_post_version_idx").on(table.postId, table.version),
		index("post_versions_editor_id_idx").on(table.editorId),
		index("post_versions_edited_at_idx").on(table.editedAt),
	],
);
