# VAI-VEX API Documentation

## Overview

The VAI-VEX platform provides a comprehensive API built on Convex for real-time data synchronization, authentication, and payment processing. This documentation covers the public-facing queries and mutations available to developers.

## Authentication

All authenticated endpoints require a valid Clerk session. The platform automatically handles authentication through the Convex-Clerk integration.

### Authentication Flow
```typescript
// Authentication is handled automatically via ConvexProviderWithClerk
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider } from "@clerk/nextjs";

// Wrap your app
<ClerkProvider>
  <ConvexProviderWithClerk client={convex}>
    <App />
  </ConvexProviderWithClerk>
</ClerkProvider>
```

## Member API

### Queries

#### `members.getCurrentMember`
Get the currently authenticated member's profile.

```typescript
const member = useQuery(api.members.getCurrentMember);
// Returns: Doc<"members"> | null
```

#### `members.getMemberBySlug`
Get a member by their slug.

```typescript
const member = useQuery(api.members.getMemberBySlug, { 
  slug: "john-doe" 
});
// Returns: Doc<"members"> | null
```

#### `members.searchMembers`
Search members by name or email.

```typescript
const results = useQuery(api.members.searchMembers, { 
  searchTerm: "john",
  limit: 10 // optional, default 20
});
// Returns: Doc<"members">[]
```

### Mutations

#### `members.updateProfile`
Update the current member's profile.

```typescript
const updateProfile = useMutation(api.members.updateProfile);
await updateProfile({
  bio: "AI Engineer and founder",
  location: "San Francisco, CA",
  twitterHandle: "johndoe",
  linkedinUrl: "https://linkedin.com/in/johndoe",
  githubHandle: "johndoe"
});
```

## Posts API

### Queries

#### `posts.listPosts`
Get paginated posts with optional filtering.

```typescript
const posts = useQuery(api.posts.listPosts, {
  paginationOpts: {
    numItems: 20,
    cursor: null // or cursor from previous page
  },
  category: "technology", // optional
  authorId: "member123", // optional
  searchQuery: "AI" // optional
});
// Returns: { 
//   page: Doc<"posts">[],
//   continueCursor: string | null,
//   isDone: boolean
// }
```

#### `posts.getPostBySlug`
Get a single post by slug. Content may be truncated based on membership.

```typescript
const post = useQuery(api.posts.getPostBySlug, { 
  slug: "building-ai-agents" 
});
// Returns: Doc<"posts"> & {
//   isPaywalled?: boolean,
//   fullContentRequiresTier?: string
// }
```

### Mutations

#### `posts.create`
Create a new post.

```typescript
const createPost = useMutation(api.posts.create);
const postId = await createPost({
  title: "Building AI Agents",
  content: "Full markdown content...",
  category: "technology",
  contentType: "text", // or "image", "video", "link"
  imageUrl: "https://...", // for image posts
  videoUrl: "https://...", // for video posts
  linkUrl: "https://...", // for link posts
});
```

#### `posts.vote`
Vote on a post.

```typescript
const vote = useMutation(api.posts.vote);
await vote({
  postId: "post123",
  voteType: "upvote" // or "downvote"
});
```

## Comments API

### Queries

#### `comments.getByPostId`
Get comments for a post.

```typescript
const comments = useQuery(api.comments.getByPostId, { 
  postId: "post123" 
});
// Returns: Doc<"comments">[] (hierarchical structure)
```

### Mutations

#### `comments.create`
Add a comment to a post.

```typescript
const createComment = useMutation(api.comments.create);
await createComment({
  postId: "post123",
  content: "Great post!",
  parentCommentId: "comment456" // optional, for replies
});
```

## Payment API

### Queries

#### `stripe.getSubscriptionInfo`
Get the current member's subscription details.

```typescript
const subscription = useQuery(api.stripe.getSubscriptionInfo);
// Returns: {
//   tier: "free" | "scholarship" | "founding_member" | "early_bird" | "member",
//   status: "active" | "cancelled" | "past_due" | "expired" | "none",
//   cancelAtPeriodEnd: boolean,
//   currentPeriodEnd?: number,
//   renewsIn?: string, // e.g., "in 15 days"
//   billingInterval?: "monthly" | "yearly",
//   nextBillingDate?: string,
//   amountCents?: number
// }
```

#### `helpers.access.canViewFullContent`
Check if the current member can view full content.

```typescript
// This is typically used internally, but the logic is:
// - No free tier (platform operates with zero free users)
// - Paid tiers (active): true
// - Cancelled (before end date): true
// - Expired/Past due: false
// - Scholarships: handled via Stripe coupons with early_bird tier
```

### Mutations

#### `stripe.checkout.createCheckoutSession`
Create a Stripe checkout session for subscription.

```typescript
const createCheckout = useMutation(api.stripe.checkout.createCheckoutSession);
const { url } = await createCheckout({
  priceId: "price_123", // Stripe price ID
  tier: "founding_member", // or "early_bird", "member"
  successUrl: "https://app.vai.com/welcome",
  cancelUrl: "https://app.vai.com/pricing"
});
// Redirect to url for payment
```

#### `stripe.portal.createPortalSession`
Create a Stripe customer portal session for subscription management.

```typescript
const createPortal = useMutation(api.stripe.portal.createPortalSession);
const { url } = await createPortal({
  returnUrl: "https://app.vai.com/settings/billing"
});
// Redirect to url for subscription management
```

## Notifications API

### Queries

#### `notifications.getUnreadCount`
Get count of unread notifications.

```typescript
const unreadCount = useQuery(api.notifications.getUnreadCount);
// Returns: number
```

#### `notifications.list`
Get paginated notifications.

```typescript
const notifications = useQuery(api.notifications.list, {
  limit: 20,
  cursor: null // or cursor from previous page
});
// Returns: {
//   notifications: Doc<"notifications">[],
//   nextCursor: string | null
// }
```

### Mutations

#### `notifications.markAsRead`
Mark notifications as read.

```typescript
const markAsRead = useMutation(api.notifications.markAsRead);
await markAsRead({
  notificationIds: ["notif123", "notif456"]
});
```

## Search API

### Queries

#### `search.searchAll`
Global search across posts and members.

```typescript
const results = useQuery(api.search.searchAll, {
  query: "machine learning",
  limit: 10
});
// Returns: {
//   posts: Doc<"posts">[],
//   members: Doc<"members">[]
// }
```

## Categories API

### Queries

#### `categories.list`
Get all available categories.

```typescript
const categories = useQuery(api.categories.list);
// Returns: Doc<"categories">[]
```

## Bookmarks API

### Queries

#### `bookmarks.getUserBookmarks`
Get the current user's bookmarked posts.

```typescript
const bookmarks = useQuery(api.bookmarks.getUserBookmarks);
// Returns: Doc<"posts">[]
```

### Mutations

#### `bookmarks.toggle`
Toggle bookmark status for a post.

```typescript
const toggleBookmark = useMutation(api.bookmarks.toggle);
const { isBookmarked } = await toggleBookmark({
  postId: "post123"
});
```

## Admin API

**Note**: All admin endpoints require admin role authentication.

### Member Management

#### `admin.members.list`
Get paginated member list with filters.

```typescript
const members = useQuery(api.admin.members.list, {
  status: "active", // or "cancelled", "churned"
  tier: "founding_member", // optional
  searchTerm: "john", // optional
  sortBy: "joinedDate", // or "lastActive"
  limit: 50,
  offset: 0
});
```

#### `admin.members.grantScholarship`
Grant scholarship status to a member.

```typescript
const grantScholarship = useMutation(api.admin.members.grantScholarship);
await grantScholarship({
  memberId: "member123"
});
```

### Payment Management

#### `admin.payments.list`
Get payment history.

```typescript
const payments = useQuery(api.admin.payments.list, {
  memberId: "member123", // optional
  status: "succeeded", // optional
  limit: 50,
  offset: 0
});
```

#### `stripe.refund.refundPayment`
Process a refund.

```typescript
const refundPayment = useMutation(api.stripe.refund.refundPayment);
await refundPayment({
  paymentId: "payment123",
  amount: 5000, // in cents, optional for partial refund
  reason: "Customer request"
});
```

### Analytics

#### `admin.metrics.getPaymentMetrics`
Get comprehensive payment analytics.

```typescript
const metrics = useQuery(api.admin.metrics.getPaymentMetrics, {
  timeRange: "30d" // or "7d", "90d", "1y", "all"
});
// Returns detailed revenue, member, and growth metrics
```

## Webhook Events

The platform processes these Stripe webhook events automatically:

- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Cancellation
- `invoice.payment_succeeded` - Successful payment
- `invoice.payment_failed` - Failed payment
- `charge.refunded` - Refund processed

## Error Handling

All mutations may throw `ConvexError` with these common codes:

- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `INVALID_ARGUMENT` - Invalid input
- `ALREADY_EXISTS` - Duplicate resource

```typescript
try {
  await mutation(args);
} catch (error) {
  if (error instanceof ConvexError) {
    console.error(error.message);
  }
}
```

## Rate Limits

- Search queries: 10 requests per minute
- Checkout session creation: 5 per hour
- General API calls: 100 per minute

## Webhooks

For Stripe webhooks, configure your endpoint:

```
POST /api/stripe/webhook
```

Include the webhook secret in your environment:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

## TypeScript Types

All API responses are fully typed. Import types from:

```typescript
import { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
```

## Real-time Updates

All queries automatically subscribe to real-time updates. When data changes, your UI updates instantly without polling.

```typescript
// This automatically updates when posts change
const posts = useQuery(api.posts.listPosts);
```

## Best Practices

1. **Pagination**: Always use pagination for list queries
2. **Error Handling**: Wrap mutations in try-catch blocks
3. **Optimistic Updates**: Use Convex's optimistic update patterns
4. **Caching**: Queries are automatically cached and synchronized
5. **Security**: Never expose sensitive data in queries

## Support

For API support and questions:
- GitHub Issues: https://github.com/vai-vex/vai-vex/issues
- Discord: #dev-support channel
- Email: dev@vai.community