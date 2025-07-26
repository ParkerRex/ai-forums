# Convex Schema Field Usage Analysis Report

This report analyzes the usage of all fields defined in `/Users/parkerrex/Developer/vai/convex/schema.ts` across the entire codebase.

## Executive Summary

The analysis reveals several patterns:
1. Many core fields are actively used across the codebase
2. Some optional fields appear to be legacy or unused
3. Certain fields are only used in specific contexts (migrations, imports, etc.)

## Table-by-Table Field Usage Analysis

### 1. MEMBERS Table

#### Actively Used Fields:
- **Core Identity**
  - `firstName` ✅ - Used extensively in UI, member profiles, admin views
  - `lastName` ✅ - Used extensively in UI, member profiles, admin views  
  - `email` ✅ - Primary identifier, used in auth, queries, admin
  - `externalId` ✅ - Clerk integration, auth lookups
  - `slug` ✅ - URL routing, member profile links

- **Status & Lifecycle**
  - `status` ✅ - Heavily used for filtering active/churned members
  - `joinedDate` ✅ - Used in admin views, member lists, sorting
  - `updatedAt` ✅ - Used in update operations
  - `lastOnline` ✅ - Used for member activity tracking

- **Profile Data**
  - `bio` ✅ - Displayed in member profiles
  - `avatarUrl` ✅ - Used in member cards, comments, profiles
  - `country` ✅ - Member directory filtering
  - `location` ✅ - Member directory display

- **Social Links**
  - `linkGithub` ✅ - Member profile display
  - `linkX` ✅ - Member profile display  
  - `linkYouTube` ✅ - Member profile display
  - `websiteUrl` ✅ - Member profile display
  - `linkedinUrl` ✅ - Member profile display

- **Skills & Metrics**
  - `skills` ✅ - Member filtering and profile display
  - `postCount` ✅ - Member activity metrics
  - `commentCount` ✅ - Member activity metrics
  - `netVoteCount` ✅ - Member reputation display

- **Subscription & Billing**
  - `tier` ✅ - Access control, member badges
  - `subscriptionStatus` ✅ - Billing status checks
  - `subscriptionEndDate` ✅ - Cancellation handling
  - `billingInterval` ✅ - Pricing display
  - `stripeCustomerId` ✅ - Stripe integration
  - `stripeSubscriptionId` ✅ - Stripe webhook handling
  - `amountCents` ✅ - Payment amount tracking
  - `lastPaymentDate` ✅ - Payment history

- **Access Control**
  - `role` ✅ - Admin permission checks

#### Potentially Unused/Legacy Fields:
- `authMethod` ⚠️ - Only referenced in schema, no active usage found
- `signInToken` ⚠️ - Used only in cleanup operations
- `mergedInto` ⚠️ - No active usage found (likely for future account merging)
- `lastPaymentFailure` ⚠️ - Defined but no active usage found
- `newsPreferences` ⚠️ - Only used in newsFeedSources.ts, limited usage

### 2. CATEGORIES Table

#### Actively Used Fields:
- `name` ✅ - URL routing, category identification
- `displayName` ✅ - UI display across the app
- `description` ✅ - Category tooltips and info
- `icon` ✅ - Visual identification in UI
- `postCount` ✅ - Category statistics
- `status` ✅ - Active/inactive filtering
- `createdAt` ✅ - Sorting and timestamps
- `updatedAt` ✅ - Update tracking

#### Potentially Unused Fields:
- `creatorId` ⚠️ - No active usage found
- `rules` ⚠️ - No active usage found
- `bannerImage` ⚠️ - No active usage found

### 3. POSTS Table

#### Actively Used Fields:
- **Core Content**
  - `title` ✅ - Post display, search
  - `content` ✅ - Post body rendering
  - `slug` ✅ - URL routing
  - `createdAt` ✅ - Sorting, timestamps
  - `updatedAt` ✅ - Edit tracking
  - `memberId` ✅ - Author association
  - `categoryId` ✅ - Category filtering

- **Status & Moderation**
  - `status` ✅ - Active/deleted filtering
  - `isPinned` ✅ - Pinned post queries
  - `pinScope` ✅ - Pin type filtering
  - `pinnedAt` ✅ - Pin ordering
  - `isLocked` ✅ - Comment locking

- **Engagement Metrics**
  - `upvotes` ✅ - Vote display
  - `downvotes` ✅ - Vote display
  - `netVotes` ✅ - Sorting by popularity
  - `commentCount` ✅ - Comment count display
  - `viewCount` ✅ - View statistics

- **Media & Attachments**
  - `type` ✅ - Content type rendering
  - `attachments` ✅ - Multi-media support
  - `linkUrl` ✅ - Link sharing
  - `linkTitle` ✅ - Link preview
  - `linkDescription` ✅ - Link preview
  - `linkImage` ✅ - Link preview
  - `preview` ✅ - Free user preview text
  - `isFree` ✅ - Access control

- **Legacy Media Fields** (still in use but being migrated to attachments)
  - `mediaUrl` ✅ - Legacy single media
  - `thumbnailUrl` ✅ - Legacy thumbnail
  - `aspectRatio` ✅ - Layout calculations
  - `mediaWidth` ✅ - Media dimensions
  - `mediaHeight` ✅ - Media dimensions

#### Potentially Unused Fields:
- `editedAt` ⚠️ - Limited usage
- `editReason` ⚠️ - Limited usage
- `pinnedBy` ⚠️ - No active usage found
- `linkPreviews` ⚠️ - Schema defines record type but limited usage
- `mentions` ⚠️ - No active usage found
- `pollOptions` ⚠️ - Poll feature exists but limited usage
- `pollEndsAt` ⚠️ - Poll feature exists but limited usage
- `totalPollVotes` ⚠️ - Poll feature exists but limited usage

### 4. COMMENTS Table

#### Actively Used Fields:
- **Core Content**
  - `content` ✅ - Comment text
  - `createdAt` ✅ - Timestamps
  - `updatedAt` ✅ - Edit tracking
  - `memberId` ✅ - Author association
  - `postId` ✅ - Post association

- **Threading**
  - `parentCommentId` ✅ - Comment threading
  - `depth` ✅ - Nesting level
  - `childCount` ✅ - Reply count
  - `replyToMemberId` ✅ - GitHub-style replies
  - `replyToCommentId` ✅ - GitHub-style replies

- **Status & Engagement**
  - `status` ✅ - Active/deleted filtering
  - `upvotes` ✅ - Vote display
  - `downvotes` ✅ - Vote display
  - `netVotes` ✅ - Sorting

- **Attachments**
  - `attachments` ✅ - File attachments

#### Potentially Unused Fields:
- `order` ⚠️ - Limited usage
- `editedAt` ⚠️ - Limited usage
- `editReason` ⚠️ - Limited usage
- `editHistory` ⚠️ - No active usage found
- `linkPreviews` ⚠️ - No active usage found
- `mentions` ⚠️ - No active usage found

### 5. VOTES Table

#### Actively Used Fields:
- `userId` ✅ - Vote ownership
- `targetId` ✅ - Voted item reference
- `targetType` ✅ - Post/comment/resource type
- `voteType` ✅ - Upvote/downvote
- `createdAt` ✅ - Vote timestamp
- `updatedAt` ✅ - Vote change tracking

### 6. POST_VIEWS Table

#### Actively Used Fields:
- `postId` ✅ - View tracking
- `userId` ✅ - User view deduplication
- `viewedAt` ✅ - View timestamp

#### Potentially Unused Fields:
- `ipAddress` ⚠️ - No active usage found
- `userAgent` ⚠️ - No active usage found

### 7. POST_VERSIONS Table

#### Actively Used Fields:
- All fields are actively used in the version tracking system

### 8. BOOKMARKS Table

#### Actively Used Fields:
- `memberId` ✅ - Bookmark ownership
- `targetId` ✅ - Bookmarked item
- `targetType` ✅ - Post/resource type
- `createdAt` ✅ - Bookmark timestamp

#### Potentially Unused Fields:
- `notes` ⚠️ - No active usage found
- `tags` ⚠️ - No active usage found

### 9. NOTIFICATIONS Table

#### Actively Used Fields:
- All core fields are actively used in the notification system

### 10. TOPICS Table

#### Actively Used Fields:
- `name` ✅ - URL routing
- `displayName` ✅ - UI display
- `description` ✅ - Topic info
- `resourceCount` ✅ - Statistics
- `status` ✅ - Active filtering

#### Potentially Unused Fields:
- `icon` ⚠️ - Limited usage
- `createdAt` ⚠️ - Limited usage
- `updatedAt` ⚠️ - Limited usage

### 11. RESOURCES Table

#### Actively Used Fields:
- Most fields are actively used in the resource system

#### Potentially Unused Fields:
- `difficulty` ⚠️ - Limited usage
- `linkTitle` ⚠️ - Limited usage
- `linkDescription` ⚠️ - Limited usage
- `linkImage` ⚠️ - Limited usage

### 12. POLL_VOTES Table

#### Actively Used Fields:
- All fields are used in the poll voting system

### 13. COMMENT_REPORTS Table

#### Actively Used Fields:
- All fields are used in the comment reporting system

### 14. EVENTS Table

#### Status: Limited Usage
Most event fields appear to have limited usage, suggesting the events feature may be underutilized or in development.

### 15. SUBSCRIPTIONS Table

#### Actively Used Fields:
- All fields are actively used in Stripe subscription tracking

### 16. PAYMENTS Table

#### Actively Used Fields:
- All fields are actively used in payment tracking

### 17. STRIPE_WEBHOOK_EVENTS Table

#### Actively Used Fields:
- All fields are actively used in webhook processing

### 18. NEWS_FEED_CACHE Table

#### Actively Used Fields:
- All fields are used in the news feed caching system

### 19. DISCORD_DIGEST Table

#### Actively Used Fields:
- All fields are used in the Discord digest feature

## Recommendations

### Fields to Consider Removing/Deprecating:

1. **Members Table**
   - `authMethod` - No active usage
   - `mergedInto` - No implementation found
   - `lastPaymentFailure` - Not actively used

2. **Categories Table**
   - `creatorId` - No active usage
   - `rules` - No active usage
   - `bannerImage` - No active usage

3. **Posts Table**
   - Consider completing migration from legacy media fields to attachments system
   - `mentions` - Not implemented
   - `linkPreviews` (record type) - Consider using simpler approach

4. **Comments Table**
   - `editHistory` - Not implemented
   - `mentions` - Not implemented
   - `linkPreviews` - Not implemented

5. **PostViews Table**
   - `ipAddress` - Privacy concerns, not used
   - `userAgent` - Not used

6. **Bookmarks Table**
   - `notes` - Feature not implemented
   - `tags` - Feature not implemented

### Fields to Keep Despite Limited Usage:

1. **Poll-related fields** - Feature exists but could be promoted
2. **Event fields** - Feature framework exists for future use
3. **Edit tracking fields** - Important for audit trails
4. **News preferences** - Part of active news feed feature

## Migration Opportunities

1. Complete the migration from single media fields to the attachments array system in posts
2. Consider implementing the unused social features (mentions, bookmark tags)
3. Evaluate if the events system should be fully implemented or removed

This analysis provides a comprehensive view of field usage across the Convex schema, helping identify optimization opportunities and unused code that could be cleaned up.