CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_member_target_unique" UNIQUE("member_id","target_id","target_type")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"banner_image" text,
	"rules" text,
	"post_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"creator_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "comment_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" varchar(50) NOT NULL,
	"reason_text" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"resolved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	CONSTRAINT "comment_reports_reporter_comment_unique" UNIQUE("reporter_id","comment_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"member_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"parent_comment_id" uuid,
	"depth" integer DEFAULT 0 NOT NULL,
	"child_count" integer DEFAULT 0 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"reply_to_member_id" uuid,
	"reply_to_comment_id" uuid,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"net_votes" integer DEFAULT 0 NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"link_previews" jsonb DEFAULT '[]'::jsonb,
	"mentions" jsonb DEFAULT '[]'::jsonb,
	"edit_history" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp,
	"edit_reason" text
);
--> statement-breakpoint
CREATE TABLE "discord_digest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"author" jsonb NOT NULL,
	"timestamp" timestamp NOT NULL,
	"channel_id" varchar(100) NOT NULL,
	"channel_name" varchar(100),
	"reactions" jsonb DEFAULT '[]'::jsonb,
	"reaction_score" integer DEFAULT 0 NOT NULL,
	"summary" text,
	"digest_date" timestamp NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discord_digest_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"timezone" varchar(50) DEFAULT 'UTC',
	"type" varchar(50) DEFAULT 'community_call' NOT NULL,
	"location" jsonb,
	"created_by" uuid NOT NULL,
	"max_attendees" integer,
	"requires_rsvp" boolean DEFAULT false NOT NULL,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"waitlist" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'upcoming' NOT NULL,
	"google_calendar_id" text,
	"discord_event_id" text,
	"stream_url" text,
	"recording_url" text,
	"resources" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"bio" text,
	"avatar_url" text,
	"password_hash" text,
	"auth_method" varchar(20) DEFAULT 'password',
	"website_url" text,
	"linkedin_url" text,
	"link_github" text,
	"link_x" text,
	"link_youtube" text,
	"country" varchar(100),
	"location" varchar(255),
	"skills" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"net_vote_count" integer DEFAULT 0 NOT NULL,
	"joined_date" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_online" timestamp DEFAULT now() NOT NULL,
	"news_preferences" jsonb,
	CONSTRAINT "members_email_unique" UNIQUE("email"),
	CONSTRAINT "members_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "news_feed_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"cache_key" text NOT NULL,
	"articles" jsonb DEFAULT '[]'::jsonb,
	"sources" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "news_feed_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"actor_id" uuid,
	"type" varchar(50) NOT NULL,
	"entity_type" varchar(20),
	"entity_id" uuid,
	"message" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"option_id" varchar(100) NOT NULL,
	"voted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "poll_votes_user_poll_unique" UNIQUE("user_id","poll_id")
);
--> statement-breakpoint
CREATE TABLE "post_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"editor_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"edit_reason" text,
	"type" varchar(20),
	"media_url" text,
	"thumbnail_url" text,
	"aspect_ratio" real,
	"media_width" integer,
	"media_height" integer,
	"link_url" text,
	"link_title" varchar(255),
	"link_description" text,
	"link_image" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"edited_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"preview" text,
	"member_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"type" varchar(20) DEFAULT 'text' NOT NULL,
	"media_url" text,
	"thumbnail_url" text,
	"aspect_ratio" real,
	"media_width" integer,
	"media_height" integer,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"link_url" text,
	"link_title" varchar(255),
	"link_description" text,
	"link_image" text,
	"link_previews" jsonb DEFAULT '[]'::jsonb,
	"poll_options" jsonb,
	"poll_ends_at" timestamp,
	"total_poll_votes" integer DEFAULT 0,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"net_votes" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"mentions" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"is_free" boolean DEFAULT true NOT NULL,
	"pin_scope" varchar(20),
	"pinned_at" timestamp,
	"pinned_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp,
	"edit_reason" text,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"topic_id" uuid NOT NULL,
	"type" varchar(20) DEFAULT 'article' NOT NULL,
	"difficulty" varchar(20),
	"is_paid" boolean DEFAULT false NOT NULL,
	"is_free" boolean DEFAULT true NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"net_votes" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"link_title" varchar(255),
	"link_description" text,
	"link_image" text,
	"member_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"token" text NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"resource_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topics_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"vote_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "votes_user_target_unique" UNIQUE("user_id","target_id","target_type")
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_creator_id_members_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_reporter_id_members_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_resolved_by_members_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_reply_to_member_id_members_id_fk" FOREIGN KEY ("reply_to_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_feed_cache" ADD CONSTRAINT "news_feed_cache_user_id_members_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_members_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_members_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_posts_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_user_id_members_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_versions" ADD CONSTRAINT "post_versions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_versions" ADD CONSTRAINT "post_versions_editor_id_members_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_user_id_members_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_pinned_by_members_id_fk" FOREIGN KEY ("pinned_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_members_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_member_id_idx" ON "bookmarks" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "bookmarks_target_id_idx" ON "bookmarks" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "bookmarks_member_type_idx" ON "bookmarks" USING btree ("member_id","target_type");--> statement-breakpoint
CREATE INDEX "bookmarks_member_created_at_idx" ON "bookmarks" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "categories_name_idx" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "categories_status_idx" ON "categories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "categories_post_count_idx" ON "categories" USING btree ("post_count");--> statement-breakpoint
CREATE INDEX "comment_reports_comment_id_idx" ON "comment_reports" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_reports_status_idx" ON "comment_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comments_post_id_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "comments_member_id_idx" ON "comments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "comments_parent_comment_id_idx" ON "comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE INDEX "comments_status_idx" ON "comments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comments_post_created_at_idx" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_post_net_votes_idx" ON "comments" USING btree ("post_id","net_votes");--> statement-breakpoint
CREATE INDEX "comments_parent_order_idx" ON "comments" USING btree ("parent_comment_id","order");--> statement-breakpoint
CREATE INDEX "discord_digest_digest_date_idx" ON "discord_digest" USING btree ("digest_date");--> statement-breakpoint
CREATE INDEX "discord_digest_reaction_score_idx" ON "discord_digest" USING btree ("reaction_score");--> statement-breakpoint
CREATE INDEX "discord_digest_message_id_idx" ON "discord_digest" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "discord_digest_processed_at_idx" ON "discord_digest" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "events_start_time_idx" ON "events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "events_created_by_idx" ON "events" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "events_start_time_status_idx" ON "events" USING btree ("start_time","status");--> statement-breakpoint
CREATE INDEX "members_email_idx" ON "members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "members_slug_idx" ON "members" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "members_status_idx" ON "members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "members_last_online_idx" ON "members" USING btree ("last_online");--> statement-breakpoint
CREATE INDEX "members_joined_date_idx" ON "members" USING btree ("joined_date");--> statement-breakpoint
CREATE INDEX "news_feed_cache_cache_key_idx" ON "news_feed_cache" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX "news_feed_cache_user_created_at_idx" ON "news_feed_cache" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "news_feed_cache_created_at_idx" ON "news_feed_cache" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_id_idx" ON "notifications" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_read_idx" ON "notifications" USING btree ("recipient_id","read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "poll_votes_poll_id_idx" ON "poll_votes" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "post_versions_post_id_idx" ON "post_versions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_versions_post_version_idx" ON "post_versions" USING btree ("post_id","version");--> statement-breakpoint
CREATE INDEX "post_versions_editor_id_idx" ON "post_versions" USING btree ("editor_id");--> statement-breakpoint
CREATE INDEX "post_versions_edited_at_idx" ON "post_versions" USING btree ("edited_at");--> statement-breakpoint
CREATE INDEX "post_views_post_id_idx" ON "post_views" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_views_user_id_idx" ON "post_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "post_views_post_user_idx" ON "post_views" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "post_views_viewed_at_idx" ON "post_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "posts_member_id_idx" ON "posts" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "posts_category_id_idx" ON "posts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_net_votes_idx" ON "posts" USING btree ("net_votes");--> statement-breakpoint
CREATE INDEX "posts_category_created_at_idx" ON "posts" USING btree ("category_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_category_net_votes_idx" ON "posts" USING btree ("category_id","net_votes");--> statement-breakpoint
CREATE INDEX "posts_pinned_category_idx" ON "posts" USING btree ("is_pinned","category_id");--> statement-breakpoint
CREATE INDEX "resources_topic_id_idx" ON "resources" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "resources_member_id_idx" ON "resources" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "resources_status_idx" ON "resources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "resources_topic_votes_idx" ON "resources" USING btree ("topic_id","net_votes");--> statement-breakpoint
CREATE INDEX "resources_topic_created_at_idx" ON "resources" USING btree ("topic_id","created_at");--> statement-breakpoint
CREATE INDEX "password_reset_member_id_idx" ON "password_reset_tokens" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "password_reset_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_member_id_idx" ON "sessions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "topics_name_idx" ON "topics" USING btree ("name");--> statement-breakpoint
CREATE INDEX "topics_status_idx" ON "topics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "votes_user_id_idx" ON "votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "votes_target_id_idx" ON "votes" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "votes_target_type_idx" ON "votes" USING btree ("target_type");