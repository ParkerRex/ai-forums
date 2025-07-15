/**
 * @fileoverview Database Schema Definition for VAI Community Platform
 * 
 * This module defines the complete database schema for a community platform built on Convex.
 * It includes all table definitions, validation schemas, and database indexes for a comprehensive
 * social platform featuring posts, comments, members, voting, bookmarks, events, and more.
 * 
 * The schema supports:
 * - Member management with authentication and profile data
 * - Post creation with multimedia attachments and categorization
 * - Nested comment system with threading and moderation
 * - Voting system for posts and comments
 * - Bookmark functionality for content curation
 * - Event management with RSVP capabilities
 * - Notification system for user engagement
 * - Resource sharing with topics and categorization
 * - Search functionality across all content types
 * - Admin features for content moderation
 * 
 * @author VAI Development Team
 * @version 1.0.0
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Reusable validation schemas for consistent type checking across the platform.
 * These validators ensure data integrity and provide TypeScript type safety.
 */
/** Post lifecycle status validation - controls visibility and availability */
export const PostStatusValidator = v.union(
  v.literal("active"),    // Published and visible to users
  v.literal("deleted"),   // Soft-deleted by author or moderator
  v.literal("hidden"),    // Hidden by moderator but not deleted
  v.literal("archived")   // Archived for historical purposes
);

/** Post content type validation - determines rendering and interaction behavior */
export const PostTypeValidator = v.union(
  v.literal("text"),     // Text-only posts with optional rich formatting
  v.literal("image"),    // Posts with image attachments
  v.literal("video"),    // Posts with video content or embeds
  v.literal("link"),     // Posts sharing external links with preview
  v.literal("poll")      // Interactive poll posts with voting options
);

/** Comment moderation status validation */
export const CommentStatusValidator = v.union(
  v.literal("active"),   // Visible comment in thread
  v.literal("deleted"),  // Soft-deleted comment (shows as [deleted])
  v.literal("hidden")    // Hidden by moderator
);

/** Vote direction validation for voting system */
export const VoteTypeValidator = v.union(
  v.literal("upvote"),    // Positive vote (+1)
  v.literal("downvote")   // Negative vote (-1)
);

/** Target content type for votes, bookmarks, and other interactions */
export const TargetTypeValidator = v.union(
  v.literal("post"),      // Vote/bookmark targets a post
  v.literal("comment"),   // Vote/bookmark targets a comment
  v.literal("resource")   // Vote/bookmark targets a resource
);

/** Category availability and access control validation */
export const CategoryStatusValidator = v.union(
  v.literal("active"),    // Public category accepting new posts
  v.literal("inactive"),  // Disabled category (no new posts)
  v.literal("private")    // Private category with restricted access
);

/**
 * Members table - Core user profiles and authentication data
 * 
 * Stores user account information, profile data, social links, and cached statistics.
 * Supports both legacy email-based auth and modern Clerk-based authentication.
 * Includes member status tracking, role-based access control, and engagement metrics.
 */
const members = defineTable({
  // Core identity fields
  firstName: v.string(),                    // User's first name
  lastName: v.string(),                     // User's last name  
  email: v.string(),                        // Primary email address (unique identifier)
  externalId: v.optional(v.string()),       // Clerk user ID for modern auth system
  
  // Member status and lifecycle
  status: v.union(
    v.literal("active"),           // Active paying or engaged member
    v.literal("cancelled"),        // Subscription cancelled but still in grace period
    v.literal("churned"),          // Previously active, now inactive
    v.literal("duplicate")         // Duplicate account marked for cleanup
  ),
  joinedDate: v.number(),                   // Unix timestamp of account creation
  updatedAt: v.number(),                    // Last profile update timestamp
  lastOnline: v.number(),                   // Last activity timestamp for presence
  
  // Authentication
  authMethod: v.optional(v.union(                 // How user authenticated
    v.literal("password"),
    v.literal("google"),
    v.literal("discord")
  )),
  signInToken: v.optional(v.string()),             // Temporary token for auto-signin after checkout
  
  // Profile and location data
  country: v.optional(v.string()),          // Country code or name
  location: v.optional(v.string()),         // City/region for member directory
  bio: v.optional(v.string()),              // Member bio/description (max 500 chars)
  slug: v.string(),                         // URL-friendly unique identifier
  
  // Account management
  mergedInto: v.optional(v.id("members")),  // Reference if account was merged
  
  // Social media and external links
  linkGithub: v.optional(v.string()),       // GitHub profile URL
  linkX: v.optional(v.string()),            // X (Twitter) profile URL
  linkYouTube: v.optional(v.string()),      // YouTube channel URL
  avatarUrl: v.optional(v.string()),        // Profile image URL
  websiteUrl: v.optional(v.string()),       // Personal website URL
  linkedinUrl: v.optional(v.string()),      // LinkedIn profile URL
  
  // Skills and expertise
  skills: v.optional(v.array(v.string())),  // Array of skill tags for filtering
  
  // Cached performance metrics (computed by background jobs)
  postCount: v.optional(v.number()),        // Total posts created by member
  commentCount: v.optional(v.number()),     // Total comments made by member
  netVoteCount: v.optional(v.number()),     // Net votes received on all content
  
  // Payment tier tracking (no free tier, scholarships handled via Stripe coupons)
  tier: v.optional(v.union(
    v.literal("founding_member"),
    v.literal("early_bird"),
    v.literal("member")
  )),
  
  // Subscription management
  subscriptionStatus: v.optional(v.union(
    v.literal("active"),
    v.literal("cancelled"),
    v.literal("past_due"),
    v.literal("expired"),
    v.literal("none")          // For members without active subscriptions
  )),
  subscriptionEndDate: v.optional(v.number()), // Unix timestamp
  billingInterval: v.optional(v.union(
    v.literal("monthly"),
    v.literal("yearly")
  )),
  
  // Stripe integration
  stripeCustomerId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()),
  
  // Payment history tracking
  lastPaymentDate: v.optional(v.number()),
  amountCents: v.optional(v.number()),
  lastPaymentFailure: v.optional(v.object({
    date: v.number(),
    code: v.string(),
    message: v.string(),
    invoiceId: v.string(),
  })),
  
  // Access control and permissions
  role: v.optional(v.union(
    v.literal("user"),      // Regular member (default)
    v.literal("admin")      // Administrator with moderation privileges
  )),
  
  // News feed customization
  newsPreferences: v.optional(v.object({
    enabledCategories: v.array(v.string()),  // News categories to include
    customSources: v.array(v.object({        // Custom news sources
      type: v.union(
        v.literal("repository"),   // GitHub repository
        v.literal("website")       // RSS/website feed
      ),
      url: v.string(),              // Source URL
      name: v.string(),             // Display name
    })),
    refreshInterval: v.number(),    // Feed refresh frequency in minutes
  })),
})
  // Indexes for efficient member queries
  .index("by_status", ["status"])                    // Filter by member status
  .index("by_joinedDate", ["joinedDate"])            // Sort by join date
  .index("by_lastOnline", ["lastOnline"])            // Find recently active members
  .index("by_status_and_joinedDate", ["status", "joinedDate"])  // Paginated member lists
  .index("by_skills", ["skills"])                    // Filter by skill tags
  .index("by_slug", ["slug"])                        // URL routing by slug
  .index("by_externalId", ["externalId"])            // Auth lookup by Clerk ID
  .index("by_stripeCustomerId", ["stripeCustomerId"]) // Stripe webhook lookups
  .searchIndex("search_members", {                    // Full-text member search
    searchField: "firstName",
    filterFields: ["status"]
  });

/**
 * Categories table - Post organization and classification system
 * 
 * Defines content categories for organizing posts and discussions.
 * Each category has moderation rules, visual branding, and usage statistics.
 * Supports public, private, and inactive states for access control.
 */
const categories = defineTable({
  name: v.string(),                         // URL-safe category identifier (lowercase)
  displayName: v.string(),                  // Human-readable category name
  description: v.string(),                  // Category purpose and guidelines
  
  // Timestamps and metrics
  createdAt: v.number(),                    // Category creation timestamp
  updatedAt: v.number(),                    // Last modification timestamp
  postCount: v.number(),                    // Cached count of active posts
  
  // Access control and lifecycle
  status: CategoryStatusValidator,          // Category availability status
  creatorId: v.id("members"),               // Member who created the category
  
  // Category customization
  rules: v.optional(v.string()),            // Category-specific posting rules
  bannerImage: v.optional(v.string()),      // Header image URL
  icon: v.optional(v.string()),             // Emoji or icon for visual identification
})
  // Indexes for category management and discovery
  .index("by_name", ["name"])                        // URL routing by category name
  .index("by_status", ["status"])                    // Filter active/inactive categories
  .index("by_postCount", ["postCount"])              // Sort by activity level
  .searchIndex("search_categories", {                // Category search functionality
    searchField: "displayName",
    filterFields: ["status"]
  });

/**
 * Posts table - Main content entities with rich media support
 * 
 * Stores user-generated posts with comprehensive metadata for different content types.
 * Supports text, images, videos, links, and polls with engagement tracking.
 * Includes advanced features like attachments, mentions, link previews, and versioning.
 */
const posts = defineTable({
    // Core post content
    title: v.string(),                       // Post title/headline
    content: v.string(),                     // Post body content (markdown supported)
    slug: v.string(),                        // URL-friendly unique identifier
    
    // Timestamps and ownership
    createdAt: v.number(),                   // Post creation timestamp
    updatedAt: v.number(),                   // Last modification timestamp
    memberId: v.id("members"),               // Post author reference
    categoryId: v.id("categories"),          // Category classification
    
    // Post lifecycle and moderation
    status: PostStatusValidator,             // Visibility and availability status
    editedAt: v.optional(v.number()),        // Last edit timestamp
    editReason: v.optional(v.string()),      // Reason for last edit
    
    // Engagement metrics
    upvotes: v.number(),                     // Positive votes received
    downvotes: v.number(),                   // Negative votes received
    netVotes: v.number(),                    // Net vote score (upvotes - downvotes)
    commentCount: v.number(),                // Total comments on post
    viewCount: v.number(),                   // View/impression count
    
    // Moderation flags
    isPinned: v.optional(v.boolean()),       // Sticky post at top of category
    isLocked: v.optional(v.boolean()),       // Comments disabled
    
    // Pin management fields
    pinScope: v.optional(v.union(
      v.literal("category"),     // Pinned only in its category
      v.literal("global"),       // Pinned in "all" view
      v.literal("both")          // Pinned in both category and global
    )),
    pinnedAt: v.optional(v.number()),        // Timestamp when pinned
    pinnedBy: v.optional(v.id("members")),   // Admin who pinned the post
    
    // Content type and media
    type: v.optional(PostTypeValidator),     // Content type for rendering
    mediaUrl: v.optional(v.string()),        // Primary media URL (legacy)
    thumbnailUrl: v.optional(v.string()),    // Thumbnail/preview image URL
    aspectRatio: v.optional(v.number()),     // Media aspect ratio for layout
    mediaWidth: v.optional(v.number()),      // Original media width in pixels
    mediaHeight: v.optional(v.number()),     // Original media height in pixels
    
    // Link sharing and previews
    linkUrl: v.optional(v.string()),         // Shared link URL
    linkTitle: v.optional(v.string()),       // Extracted link title
    linkDescription: v.optional(v.string()), // Extracted link description
    linkImage: v.optional(v.string()),       // Extracted link preview image
    linkPreviews: v.optional(v.record(v.string(), v.object({  // Rich link previews
      title: v.optional(v.string()),         // Page title
      description: v.optional(v.string()),   // Meta description
      image: v.optional(v.string()),         // Preview image URL
      siteName: v.optional(v.string()),      // Site name
      url: v.string(),                       // Canonical URL
    }))),
    
    // Social features
    mentions: v.optional(v.array(v.id("members"))),  // @mentioned members
    
    // Poll functionality
    pollOptions: v.optional(v.array(v.object({      // Poll choice options
      id: v.string(),                        // Unique option identifier
      text: v.string(),                      // Option display text
      voteCount: v.number()                  // Votes for this option
    }))),
    pollEndsAt: v.optional(v.number()),      // Poll expiration timestamp
    totalPollVotes: v.optional(v.number()),  // Total votes cast in poll
    
    // Content preview for free users
    preview: v.optional(v.string()),             // Auto-generated preview text (2-3 lines)
    isFree: v.optional(v.boolean()),             // Whether post is free to read
    
    // Multi-attachment system
    attachments: v.optional(v.array(v.object({
      id: v.string(),                        // Unique attachment identifier
      type: v.union(                         // Attachment content type
        v.literal("image"),     // Static image file
        v.literal("video"),     // Video file
        v.literal("pdf"),       // PDF document
        v.literal("youtube")    // YouTube embed
      ),
      url: v.string(),                       // Attachment URL
      thumbnailUrl: v.optional(v.string()),  // Thumbnail/preview URL
      width: v.optional(v.number()),         // Original width
      height: v.optional(v.number()),        // Original height
      aspectRatio: v.optional(v.number()),   // Calculated aspect ratio
      order: v.number(),                     // Display order in gallery
      
      // PDF-specific metadata
      pageCount: v.optional(v.number()),     // Number of PDF pages
      fileSize: v.optional(v.number()),      // File size in bytes
      
      // YouTube-specific metadata
      videoId: v.optional(v.string()),       // YouTube video ID
      title: v.optional(v.string()),         // Video title
      duration: v.optional(v.string()),      // Video duration string
      channelName: v.optional(v.string()),   // YouTube channel name
      
      // Video file metadata
      videoDuration: v.optional(v.string()), // Duration for uploaded videos
      format: v.optional(v.string()),        // Video format/container
      resolution: v.optional(v.string()),    // Video resolution (e.g., "1080p")
      codec: v.optional(v.string()),         // Video codec information
    }))),

})
  // Indexes for efficient post queries and feeds
  .index("by_categoryId", ["categoryId"])            // Posts by category
  .index("by_memberId", ["memberId"])                // Posts by author
  .index("by_status", ["status"])                    // Filter by post status
  .index("by_createdAt", ["createdAt"])              // Chronological ordering
  .index("by_netVotes", ["netVotes"])                // Popular posts ranking
  .index("by_slug", ["slug"])                        // URL routing by slug
  .index("by_category_and_createdAt", ["categoryId", "createdAt"])    // Category feeds
  .index("by_category_and_netVotes", ["categoryId", "netVotes"])      // Popular in category
  .index("by_member_and_createdAt", ["memberId", "createdAt"])        // Member profiles
  .index("by_pinned_and_category", ["isPinned", "categoryId", "pinnedAt"])  // Pinned posts by category
  .index("by_pinned_global", ["isPinned", "pinScope", "pinnedAt"])    // Globally pinned posts
  .searchIndex("search_posts", {                     // Title-based search
    searchField: "title",
    filterFields: ["categoryId", "status", "memberId"]
  })
  .searchIndex("search_posts_content", {             // Full-text content search
    searchField: "content",
    filterFields: ["categoryId", "status", "memberId"]
  });

/**
 * Comments table - Threaded discussion system with rich content support
 * 
 * Implements a hierarchical comment system with unlimited nesting depth.
 * Supports rich media attachments, edit history, voting, and moderation.
 * Designed for high-performance rendering of large comment threads.
 */
const comments = defineTable({
    // Core comment content
    content: v.string(),                     // Comment text content
    
    // Timestamps and ownership
    createdAt: v.number(),                   // Comment creation timestamp
    updatedAt: v.number(),                   // Last modification timestamp
    memberId: v.id("members"),               // Comment author reference
    postId: v.id("posts"),                   // Parent post reference
    
    // Threading and hierarchy
    parentCommentId: v.optional(v.id("comments")),  // Parent comment for replies
    depth: v.number(),                       // Nesting level (0 = top-level)
    childCount: v.number(),                  // Direct child comment count
    order: v.optional(v.number()),           // Sort order within parent
    
    // GitHub-style flat comment references
    replyToMemberId: v.optional(v.id("members")),   // Member being replied to (for flat display)
    replyToCommentId: v.optional(v.id("comments")), // Comment being replied to (for context)
    
    // Moderation and lifecycle
    status: CommentStatusValidator,          // Visibility and moderation status
    
    // Engagement metrics
    upvotes: v.number(),                     // Positive votes received
    downvotes: v.number(),                   // Negative votes received
    netVotes: v.number(),                    // Net vote score
    
    // Edit tracking
    editedAt: v.optional(v.number()),        // Last edit timestamp
    editReason: v.optional(v.string()),      // Reason for edit
    editHistory: v.optional(v.array(v.object({  // Edit history for transparency
      content: v.string(),                   // Previous content version
      editedAt: v.number(),                  // Edit timestamp
      attachments: v.optional(v.array(v.object({  // Previous attachments
        id: v.string(),                      // Attachment identifier
        type: v.union(
          v.literal("image"),     // Image attachment
          v.literal("document"),  // Document attachment
          v.literal("gif")        // GIF attachment
        ),
        url: v.string(),                     // File URL
        fileName: v.string(),                // Original filename
        fileSize: v.number(),                // File size in bytes
        mimeType: v.string(),                // MIME type
        width: v.optional(v.number()),       // Image width
        height: v.optional(v.number()),      // Image height
      }))),
    }))),
    
    // Current attachments
    attachments: v.optional(v.array(v.object({
      id: v.string(),                        // Unique attachment identifier
      type: v.union(
        v.literal("image"),       // Image file
        v.literal("document"),    // Document/PDF file
        v.literal("gif")          // Animated GIF
      ),
      url: v.string(),                       // Storage URL
      fileName: v.string(),                  // Original filename
      fileSize: v.number(),                  // File size in bytes
      mimeType: v.string(),                  // File MIME type
      width: v.optional(v.number()),         // Image dimensions
      height: v.optional(v.number()),
    }))),
    
    // Link previews for shared URLs
    linkPreviews: v.optional(v.record(v.string(), v.object({
      title: v.optional(v.string()),         // Link title
      description: v.optional(v.string()),   // Link description
      image: v.optional(v.string()),         // Preview image
      siteName: v.optional(v.string()),      // Site name
      url: v.string(),                       // Original URL
    }))),
    
    // Social features
    mentions: v.optional(v.array(v.id("members"))),  // @mentioned members
})
  // Indexes for efficient comment threading and queries
  .index("by_postId", ["postId"])                    // Comments for a post
  .index("by_memberId", ["memberId"])                // Comments by author
  .index("by_parentCommentId", ["parentCommentId"])  // Child comments lookup
  .index("by_post_and_createdAt", ["postId", "createdAt"])        // Chronological post comments
  .index("by_post_and_netVotes", ["postId", "netVotes"])          // Popular post comments
  .index("by_parent_and_createdAt", ["parentCommentId", "createdAt"])  // Child comment ordering
  .index("by_parent_and_order", ["parentCommentId", "order"])     // Custom reply ordering
  .index("by_status", ["status"])                    // Moderation queries
  .index("by_post_member_createdAt", ["postId", "memberId", "createdAt"])  // Member activity
  .searchIndex("search_comments", {                  // Comment content search
    searchField: "content",
    filterFields: ["postId", "status", "memberId"]
  });

/**
 * Votes table - User voting system for content engagement
 * 
 * Tracks upvotes and downvotes on posts, comments, and resources.
 * Enforces one vote per user per target with vote switching support.
 * Used for ranking algorithms and engagement metrics.
 */
const votes = defineTable({
    userId: v.id("members"),                 // Member who cast the vote
    targetId: v.string(),                    // ID of voted content (post/comment/resource)
    targetType: TargetTypeValidator,         // Type of content being voted on
    voteType: VoteTypeValidator,             // Vote direction (upvote/downvote)
    createdAt: v.number(),                   // Initial vote timestamp
    updatedAt: v.number(),                   // Last vote change timestamp
})
  // Indexes for vote tracking and aggregation
  .index("by_userId", ["userId"])                    // User's voting history
  .index("by_targetId", ["targetId"])                // Votes on specific content
  .index("by_user_and_target", ["userId", "targetId", "targetType"])  // Prevent duplicate votes
  .index("by_target_and_type", ["targetId", "targetType"]);           // Vote aggregation

/**
 * Post Views table - Analytics and engagement tracking
 * 
 * Records post view events for analytics and preventing duplicate view counting.
 * Supports both authenticated and anonymous users with deduplication logic.
 * Used for trending algorithms and content performance metrics.
 */
const postViews = defineTable({
    postId: v.id("posts"),                   // Post being viewed
    userId: v.optional(v.id("members")),     // Viewing user (if authenticated)
    viewedAt: v.number(),                    // View timestamp
    ipAddress: v.optional(v.string()),       // IP address for anonymous deduplication
    userAgent: v.optional(v.string()),       // Browser info for analytics
})
  // Indexes for view tracking and analytics
  .index("by_postId", ["postId"])                    // Views for specific post
  .index("by_userId", ["userId"])                    // User's viewing history
  .index("by_post_and_user", ["postId", "userId"])  // Deduplication checks
  .index("by_viewedAt", ["viewedAt"]);               // Time-based analytics

/**
 * Post Versions table - Edit history and content versioning
 * 
 * Maintains complete edit history for posts with full content snapshots.
 * Enables version comparison, rollback functionality, and edit transparency.
 * Stores all metadata to reconstruct any previous post state.
 */
const post_versions = defineTable({
    postId: v.id("posts"),                   // Post being versioned
    version: v.number(),                     // Sequential version number
    title: v.string(),                       // Post title at this version
    content: v.string(),                     // Post content at this version
    editorId: v.id("members"),               // Member who made this edit
    editedAt: v.number(),                    // Edit timestamp
    editReason: v.optional(v.string()),      // Reason provided for edit
    
    // Complete post state snapshot for full reconstruction
    type: v.optional(PostTypeValidator),     // Post type at this version
    mediaUrl: v.optional(v.string()),        // Media URL
    thumbnailUrl: v.optional(v.string()),    // Thumbnail URL
    linkUrl: v.optional(v.string()),         // Shared link URL
    linkTitle: v.optional(v.string()),       // Link title
    linkDescription: v.optional(v.string()), // Link description
    linkImage: v.optional(v.string()),       // Link preview image
    aspectRatio: v.optional(v.number()),     // Media aspect ratio
    mediaWidth: v.optional(v.number()),      // Media dimensions
    mediaHeight: v.optional(v.number()),
    
    // Attachment state at this version
    attachments: v.optional(v.array(v.object({
      id: v.string(),                        // Attachment identifier
      type: v.union(
        v.literal("image"),
        v.literal("video"),
        v.literal("pdf"),
        v.literal("youtube")
      ),
      url: v.string(),                       // File URL
      thumbnailUrl: v.optional(v.string()),  // Thumbnail URL
      width: v.optional(v.number()),         // Dimensions
      height: v.optional(v.number()),
      aspectRatio: v.optional(v.number()),   // Calculated ratio
      order: v.number(),                     // Display order
      
      // Type-specific metadata
      pageCount: v.optional(v.number()),     // PDF pages
      fileSize: v.optional(v.number()),      // File size
      videoId: v.optional(v.string()),       // YouTube ID
      title: v.optional(v.string()),         // Media title
      duration: v.optional(v.string()),      // Duration
      channelName: v.optional(v.string()),   // Channel/creator
      videoDuration: v.optional(v.string()), // Video length
      format: v.optional(v.string()),        // File format
      resolution: v.optional(v.string()),    // Resolution
      codec: v.optional(v.string()),         // Codec info
    }))),
})
  // Indexes for version history and auditing
  .index("by_postId", ["postId"])                    // All versions of a post
  .index("by_post_and_version", ["postId", "version"])  // Specific version lookup
  .index("by_editorId", ["editorId"])                // Edits by specific member
  .index("by_editedAt", ["editedAt"]);               // Chronological edit history

/**
 * Bookmarks table - Personal content curation and organization
 * 
 * Allows members to save posts and resources for later reference.
 * Supports personal notes and tags for organization and searchability.
 * Enables building personal knowledge bases from community content.
 */
const bookmarks = defineTable({
    memberId: v.id("members"),               // Member who created bookmark
    targetId: v.string(),                    // ID of bookmarked content
    targetType: v.union(
      v.literal("post"),       // Bookmarked post
      v.literal("resource")    // Bookmarked resource
    ),
    createdAt: v.number(),                   // Bookmark creation timestamp
    notes: v.optional(v.string()),           // Personal notes about content
    tags: v.optional(v.array(v.string())),   // User-defined tags for organization
})
  // Indexes for bookmark management and organization
  .index("by_memberId", ["memberId"])                // User's bookmarks
  .index("by_member_and_target", ["memberId", "targetId", "targetType"])  // Duplicate prevention
  .index("by_member_and_type", ["memberId", "targetType"])             // Filter by content type
  .index("by_member_and_createdAt", ["memberId", "createdAt"])          // Chronological bookmarks
  .index("by_targetId", ["targetId"]);               // Popularity metrics

/**
 * Notifications table - Real-time user engagement system
 * 
 * Manages user notifications for mentions, replies, votes, and system events.
 * Supports real-time delivery and read state tracking for user engagement.
 * Enables building activity feeds and notification centers.
 */
const notifications = defineTable({
  recipientId: v.id("members"),             // Member receiving notification
  type: v.union(
    v.literal("mention"),      // @mentioned in content
    v.literal("reply"),        // Reply to user's content
    v.literal("upvote"),       // Content received upvote
    v.literal("follow"),       // New follower (future feature)
    v.literal("comment_report"), // Comment reported (admin)
    v.literal("payment_reminder") // Subscription renewal reminder
  ),
  entityType: v.union(
    v.literal("post"),         // Notification relates to post
    v.literal("comment"),      // Notification relates to comment
    v.literal("payment")       // Notification relates to payment/subscription
  ),
  entityId: v.string(),                    // ID of related content
  actorId: v.id("members"),                // Member who triggered notification
  message: v.string(),                     // Human-readable notification text
  read: v.boolean(),                       // Read status for UI badges
  createdAt: v.number(),                   // Notification timestamp
})
  // Indexes for notification delivery and management
  .index("by_recipient", ["recipientId"])            // User's notifications
  .index("by_recipient_and_read", ["recipientId", "read"])  // Unread notifications
  .index("by_createdAt", ["createdAt"]);             // Cleanup old notifications

/**
 * Topics table - Subject matter classification for resources
 * 
 * Organizes educational resources and content by subject areas.
 * Provides hierarchical categorization for learning paths and discovery.
 * Supports icons and descriptions for rich topic browsing experience.
 */
const topics = defineTable({
    name: v.string(),                        // URL-safe topic identifier
    displayName: v.string(),                 // Human-readable topic name
    description: v.string(),                 // Topic description and scope
    icon: v.optional(v.string()),            // Emoji or icon for visual ID
    resourceCount: v.number(),               // Cached count of active resources
    createdAt: v.number(),                   // Topic creation timestamp
    updatedAt: v.number(),                   // Last modification timestamp
    status: v.union(
      v.literal("active"),     // Available for new resources
      v.literal("inactive")    // Disabled/archived topic
    ),
})
  // Indexes for topic management and discovery
  .index("by_name", ["name"])                        // URL routing by topic name
  .index("by_status", ["status"])                    // Filter active topics
  .searchIndex("search_topics", {                    // Topic search functionality
    searchField: "displayName",
    filterFields: ["status"]
  });

/**
 * Resources table - Educational content and tool recommendations
 * 
 * Curated library of external resources shared by community members.
 * Supports various content types with quality control through voting and moderation.
 * Enables building comprehensive learning paths and tool recommendations.
 */
const resources = defineTable({
    title: v.string(),                       // Resource title
    description: v.string(),                 // Resource description and benefits
    url: v.string(),                         // External resource URL
    topicId: v.id("topics"),                 // Topic classification
    memberId: v.id("members"),               // Member who shared resource
    
    // Resource classification
    type: v.union(
      v.literal("article"),       // Blog post, tutorial, guide
      v.literal("video"),         // Video content, courses
      v.literal("course"),        // Structured learning course
      v.literal("documentation"), // Official docs, references
      v.literal("tool"),          // Software tool, service
      v.literal("book"),          // Book, ebook, publication
      v.literal("other")          // Other resource types
    ),
    
    // Learning metadata
    difficulty: v.optional(v.union(
      v.literal("beginner"),      // Entry-level content
      v.literal("intermediate"),  // Some experience required
      v.literal("advanced")       // Expert-level content
    )),
    isPaid: v.boolean(),                     // Whether resource costs money
    isFree: v.optional(v.boolean()),        // Whether resource is free for all users
    
    // Engagement and quality metrics
    upvotes: v.number(),                     // Community upvotes
    downvotes: v.number(),                   // Community downvotes
    netVotes: v.number(),                    // Net vote score for ranking
    viewCount: v.number(),                   // Click-through count
    
    // Moderation and lifecycle
    status: v.union(
      v.literal("pending"),       // Awaiting moderation
      v.literal("active"),        // Approved and visible
      v.literal("rejected"),      // Rejected by moderators
      v.literal("outdated")       // Marked as outdated/deprecated
    ),
    
    // Timestamps
    createdAt: v.number(),                   // Resource submission timestamp
    updatedAt: v.number(),                   // Last modification timestamp
    
    // Rich link preview data
    linkTitle: v.optional(v.string()),       // Extracted page title
    linkDescription: v.optional(v.string()), // Extracted meta description
    linkImage: v.optional(v.string()),       // Preview image URL
})
  // Indexes for resource discovery and management
  .index("by_topicId", ["topicId"])                  // Resources by topic
  .index("by_memberId", ["memberId"])                // Resources by contributor
  .index("by_status", ["status"])                    // Moderation workflows
  .index("by_topic_and_votes", ["topicId", "netVotes"])      // Popular resources by topic
  .index("by_topic_and_createdAt", ["topicId", "createdAt"])  // Recent resources by topic
  .searchIndex("search_resources", {                 // Resource search functionality
    searchField: "title",
    filterFields: ["topicId", "type", "status"]
  });

/**
 * Poll Votes table - Interactive poll participation tracking
 * 
 * Records individual votes in poll posts to prevent duplicate voting.
 * Enables real-time poll result updates and vote history tracking.
 * Supports poll analytics and engagement metrics.
 */
const pollVotes = defineTable({
    pollId: v.id("posts"),                   // Poll post being voted on
    userId: v.id("members"),                 // Member casting vote
    optionId: v.string(),                    // Selected poll option ID
    votedAt: v.number(),                     // Vote timestamp
})
  // Indexes for poll voting and results
  .index("by_poll", ["pollId"])                      // All votes for a poll
  .index("by_user_and_poll", ["userId", "pollId"]);  // Prevent duplicate voting

/**
 * Comment Reports table - Content moderation and community safety
 * 
 * Tracks user reports of inappropriate comments for moderator review.
 * Supports categorized reporting with optional detailed explanations.
 * Enables audit trails and resolution tracking for moderation decisions.
 */
const commentReports = defineTable({
    commentId: v.id("comments"),             // Reported comment
    reporterId: v.id("members"),             // Member filing report
    reason: v.union(
      v.literal("spam"),         // Spam or promotional content
      v.literal("inappropriate"), // Inappropriate content
      v.literal("harassment"),    // Harassment or abuse
      v.literal("other")          // Other reason (requires text)
    ),
    reasonText: v.optional(v.string()),      // Additional explanation
    status: v.union(
      v.literal("pending"),      // Awaiting moderator review
      v.literal("resolved"),     // Action taken by moderator
      v.literal("dismissed")     // Report dismissed as invalid
    ),
    createdAt: v.number(),                   // Report submission timestamp
    resolvedAt: v.optional(v.number()),      // Resolution timestamp
    resolvedBy: v.optional(v.id("members")), // Moderator who resolved
})
  // Indexes for moderation workflows
  .index("by_comment", ["commentId"])                // Reports for specific comment
  .index("by_status", ["status"])                    // Pending reports queue
  .index("by_reporter_and_comment", ["reporterId", "commentId"]);  // Prevent duplicate reports

/**
 * Events table - Community event management and RSVP system
 * 
 * Manages virtual and physical community events with RSVP functionality.
 * Supports integration with external calendar systems and streaming platforms.
 * Enables event discovery, attendance tracking, and resource sharing.
 */
const events = defineTable({
  title: v.string(),                         // Event name/title
  description: v.string(),                   // Event description and agenda
  startTime: v.number(),                     // Event start timestamp (UTC)
  endTime: v.number(),                       // Event end timestamp (UTC)
  timezone: v.string(),                      // Event timezone (e.g., "America/New_York")
  
  // Event categorization
  type: v.union(
    v.literal("community_call"),  // Regular community meeting
    v.literal("watch_party"),     // Group viewing session
    v.literal("workshop"),        // Educational workshop
    v.literal("meetup"),          // Casual meetup/networking
    v.literal("other")            // Other event types
  ),
  
  // Location and access details
  location: v.object({
    type: v.union(
      v.literal("virtual"),    // Online event
      v.literal("physical")    // In-person event
    ),
    details: v.string(),            // Address or meeting link
    platform: v.optional(v.union(  // Platform for virtual events
      v.literal("zoom"),
      v.literal("discord"),
      v.literal("youtube"),
      v.literal("other")
    )),
  }),
  
  // Event management
  createdBy: v.id("members"),                // Event organizer
  maxAttendees: v.optional(v.number()),      // Attendance limit
  requiresRSVP: v.boolean(),                 // Whether RSVP is required
  attendees: v.array(v.id("members")),       // Confirmed attendees
  waitlist: v.array(v.id("members")),        // Waitlisted members
  
  // Event lifecycle
  status: v.union(
    v.literal("upcoming"),      // Scheduled future event
    v.literal("live"),          // Currently happening
    v.literal("completed"),     // Finished event
    v.literal("cancelled")      // Cancelled event
  ),
  
  // External integrations
  googleCalendarId: v.optional(v.string()),  // Google Calendar event ID
  discordEventId: v.optional(v.string()),    // Discord event ID
  streamUrl: v.optional(v.string()),         // Live stream URL
  recordingUrl: v.optional(v.string()),      // Recording URL (post-event)
  
  // Event resources and materials
  resources: v.array(v.object({
    title: v.string(),              // Resource title
    url: v.string(),                // Resource URL
  })),
  
  // Timestamps
  createdAt: v.number(),                     // Event creation timestamp
  updatedAt: v.number(),                     // Last modification timestamp
})
  // Indexes for event discovery and management
  .index("by_startTime", ["startTime"])              // Chronological event listing
  .index("by_createdBy", ["createdBy"])              // Events by organizer
  .index("by_status", ["status"])                    // Filter by event status
  .index("by_type", ["type"])                        // Filter by event type
  .index("by_startTime_and_status", ["startTime", "status"])  // Upcoming events feed
  .searchIndex("search_events", {                    // Event search functionality
    searchField: "title",
    filterFields: ["type", "status", "createdBy"]
  });

/**
 * Subscriptions table - Stripe subscription tracking and management
 * 
 * Tracks active and historical subscriptions for members with full Stripe integration.
 * Maintains subscription lifecycle, billing intervals, and tier information.
 * Enables subscription management, renewal tracking, and churn analysis.
 */
const subscriptions = defineTable({
  memberId: v.id("members"),
  stripeCustomerId: v.string(),
  stripeSubscriptionId: v.string(),
  stripePriceId: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("cancelled"),
    v.literal("past_due"),
    v.literal("expired")
  ),
  currentPeriodEnd: v.number(),
  cancelAtPeriodEnd: v.boolean(),
  tier: v.union(
    v.literal("founding_member"),
    v.literal("early_bird"),
    v.literal("member")
  ),
  billingInterval: v.union(
    v.literal("monthly"),
    v.literal("yearly")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  lastFailureAt: v.optional(v.number()),
})
  .index("by_memberId", ["memberId"])
  .index("by_stripeSubscriptionId", ["stripeSubscriptionId"])
  .index("by_status", ["status"]);

/**
 * Payments table - Transaction history and payment records
 * 
 * Records all payment transactions including successful payments, refunds, and failures.
 * Stores detailed payment information for financial reporting and customer service.
 * Integrates with Stripe for payment processing and reconciliation.
 */
const payments = defineTable({
  memberId: v.id("members"),
  subscriptionId: v.optional(v.id("subscriptions")),
  stripePaymentIntentId: v.string(),
  stripeInvoiceId: v.optional(v.string()),
  amount: v.number(), // in cents
  currency: v.string(),
  status: v.union(
    v.literal("succeeded"),
    v.literal("pending"),
    v.literal("failed"),
    v.literal("refunded"),
    v.literal("partially_refunded")
  ),
  description: v.string(),
  paymentMethod: v.object({
    type: v.string(),
    brand: v.optional(v.string()),
    last4: v.string(),
  }),
  transactionFee: v.optional(v.number()),
  netAmount: v.optional(v.number()),
  failureReason: v.optional(v.string()),
  failureCode: v.optional(v.string()),
  refundedAmount: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_memberId", ["memberId"])
  .index("by_stripePaymentIntentId", ["stripePaymentIntentId"])
  .index("by_status", ["status"])
  .index("by_createdAt", ["createdAt"]);

/**
 * Stripe Webhook Events table - Webhook processing and idempotency
 * 
 * Tracks Stripe webhook events to ensure idempotent processing and prevent duplicates.
 * Records processing status and errors for debugging and monitoring.
 * Essential for reliable webhook handling in distributed systems.
 */
const stripeWebhookEvents = defineTable({
  stripeEventId: v.string(),
  type: v.string(),
  processed: v.boolean(),
  error: v.optional(v.string()),
  createdAt: v.number(),
  processedAt: v.optional(v.number()),
  retryCount: v.optional(v.number()),
  lastErrorAt: v.optional(v.number()),
  needsRetry: v.optional(v.boolean()),
})
  .index("by_stripeEventId", ["stripeEventId"])
  .index("by_processed", ["processed"])
  .index("by_createdAt", ["createdAt"]);

/**
 * News feed cache table for storing aggregated news articles.
 * 
 * This table caches news articles fetched from multiple sources to reduce
 * external API calls and improve performance. Each cache entry stores the
 * aggregated results with a timestamp for cache invalidation.
 * 
 * @table newsFeedCache
 * @indexes
 * - by_userId_createdAt: For user-specific cache lookups
 * - by_createdAt: For cache cleanup operations
 */
const newsFeedCache = defineTable({
  userId: v.optional(v.id("members")),       // Optional user ID for personalized feeds
  cacheKey: v.string(),                     // Unique cache key for the feed configuration
  articles: v.array(v.object({              // Cached news articles
    title: v.string(),
    url: v.string(),
    publishedDate: v.optional(v.string()),
    author: v.optional(v.string()),
    summary: v.optional(v.string()),
    source: v.string(),
  })),
  sources: v.array(v.object({              // Sources used for this cache entry
    type: v.string(),
    url: v.string(),
    name: v.string(),
  })),
  createdAt: v.number(),                    // Cache creation timestamp
  expiresAt: v.number(),                    // Cache expiration timestamp
})
  .index("by_cacheKey", ["cacheKey"])       // Primary lookup by cache key
  .index("by_userId_createdAt", ["userId", "createdAt"])
  .index("by_createdAt", ["createdAt"]);

/**
 * Complete database schema export for the VAI community platform.
 * 
 * This schema defines a comprehensive social platform with:
 * - User management and authentication (members)
 * - Content organization (categories, topics) 
 * - User-generated content (posts, comments)
 * - Engagement systems (votes, bookmarks, notifications)
 * - Educational resources and events
 * - Moderation and safety features
 * - Analytics and tracking capabilities
 * 
 * All tables include appropriate indexes for performance and search capabilities
 * for building responsive, scalable community applications.
 */
export default defineSchema({
  members,          // User profiles and authentication
  categories,       // Post categorization system
  posts,           // Main content with multimedia support
  comments,        // Threaded discussion system
  votes,           // Voting and ranking system
  postViews,       // Analytics and view tracking
  post_versions,   // Edit history and versioning
  bookmarks,       // Personal content curation
  notifications,   // Real-time user engagement
  topics,          // Resource subject classification
  resources,       // Educational content library
  pollVotes,       // Interactive poll participation
  commentReports,  // Content moderation system
  events,          // Community event management
  subscriptions,    // Stripe subscription tracking
  payments,         // Payment transaction history
  stripeWebhookEvents, // Webhook event processing
  newsFeedCache,    // News feed caching system
});
