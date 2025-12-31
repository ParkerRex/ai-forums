import { relations } from "drizzle-orm";
import { members } from "./members";
import { sessions, passwordResetTokens } from "./sessions";
import { categories } from "./categories";
import { posts } from "./posts";
import { comments } from "./comments";
import { votes } from "./votes";
import { bookmarks } from "./bookmarks";
import { notifications } from "./notifications";
import { topics } from "./topics";
import { resources } from "./resources";
import { events } from "./events";
import { pollVotes } from "./poll-votes";
import { postVersions } from "./post-versions";
import { postViews } from "./post-views";
import { commentReports } from "./comment-reports";
import { newsFeedCache } from "./news-feed-cache";

// Members relations
export const membersRelations = relations(members, ({ many }) => ({
	posts: many(posts),
	comments: many(comments),
	sessions: many(sessions),
	votes: many(votes),
	bookmarks: many(bookmarks),
	notificationsReceived: many(notifications, { relationName: "recipient" }),
	notificationsSent: many(notifications, { relationName: "actor" }),
	resources: many(resources),
	events: many(events),
}));

// Sessions relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
	member: one(members, {
		fields: [sessions.memberId],
		references: [members.id],
	}),
}));

export const passwordResetTokensRelations = relations(
	passwordResetTokens,
	({ one }) => ({
		member: one(members, {
			fields: [passwordResetTokens.memberId],
			references: [members.id],
		}),
	}),
);

// Categories relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
	creator: one(members, {
		fields: [categories.creatorId],
		references: [members.id],
	}),
	posts: many(posts),
}));

// Posts relations
export const postsRelations = relations(posts, ({ one, many }) => ({
	member: one(members, {
		fields: [posts.memberId],
		references: [members.id],
	}),
	category: one(categories, {
		fields: [posts.categoryId],
		references: [categories.id],
	}),
	pinnedByMember: one(members, {
		fields: [posts.pinnedBy],
		references: [members.id],
		relationName: "pinnedBy",
	}),
	comments: many(comments),
	votes: many(votes),
	views: many(postViews),
	versions: many(postVersions),
	pollVotes: many(pollVotes),
}));

// Comments relations
export const commentsRelations = relations(comments, ({ one, many }) => ({
	member: one(members, {
		fields: [comments.memberId],
		references: [members.id],
	}),
	post: one(posts, {
		fields: [comments.postId],
		references: [posts.id],
	}),
	parentComment: one(comments, {
		fields: [comments.parentCommentId],
		references: [comments.id],
		relationName: "parentChild",
	}),
	childComments: many(comments, { relationName: "parentChild" }),
	replyToMember: one(members, {
		fields: [comments.replyToMemberId],
		references: [members.id],
		relationName: "replyTo",
	}),
	votes: many(votes),
	reports: many(commentReports),
}));

// Votes relations
export const votesRelations = relations(votes, ({ one }) => ({
	user: one(members, {
		fields: [votes.userId],
		references: [members.id],
	}),
}));

// Bookmarks relations
export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
	member: one(members, {
		fields: [bookmarks.memberId],
		references: [members.id],
	}),
}));

// Notifications relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
	recipient: one(members, {
		fields: [notifications.recipientId],
		references: [members.id],
		relationName: "recipient",
	}),
	actor: one(members, {
		fields: [notifications.actorId],
		references: [members.id],
		relationName: "actor",
	}),
}));

// Topics relations
export const topicsRelations = relations(topics, ({ many }) => ({
	resources: many(resources),
}));

// Resources relations
export const resourcesRelations = relations(resources, ({ one }) => ({
	topic: one(topics, {
		fields: [resources.topicId],
		references: [topics.id],
	}),
	member: one(members, {
		fields: [resources.memberId],
		references: [members.id],
	}),
}));

// Events relations
export const eventsRelations = relations(events, ({ one }) => ({
	creator: one(members, {
		fields: [events.createdBy],
		references: [members.id],
	}),
}));

// Poll votes relations
export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
	poll: one(posts, {
		fields: [pollVotes.pollId],
		references: [posts.id],
	}),
	user: one(members, {
		fields: [pollVotes.userId],
		references: [members.id],
	}),
}));

// Post versions relations
export const postVersionsRelations = relations(postVersions, ({ one }) => ({
	post: one(posts, {
		fields: [postVersions.postId],
		references: [posts.id],
	}),
	editor: one(members, {
		fields: [postVersions.editorId],
		references: [members.id],
	}),
}));

// Post views relations
export const postViewsRelations = relations(postViews, ({ one }) => ({
	post: one(posts, {
		fields: [postViews.postId],
		references: [posts.id],
	}),
	user: one(members, {
		fields: [postViews.userId],
		references: [members.id],
	}),
}));

// Comment reports relations
export const commentReportsRelations = relations(commentReports, ({ one }) => ({
	comment: one(comments, {
		fields: [commentReports.commentId],
		references: [comments.id],
	}),
	reporter: one(members, {
		fields: [commentReports.reporterId],
		references: [members.id],
		relationName: "reporter",
	}),
	resolver: one(members, {
		fields: [commentReports.resolvedBy],
		references: [members.id],
		relationName: "resolver",
	}),
}));

// News feed cache relations
export const newsFeedCacheRelations = relations(newsFeedCache, ({ one }) => ({
	user: one(members, {
		fields: [newsFeedCache.userId],
		references: [members.id],
	}),
}));
