# Skool Agent Implementation Guide

## Overview

This document provides a complete implementation guide for the Skool automation agent - a fully-featured bot that can perform all actions on Skool.com including posting, liking, commenting, DMing, and more.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Skool Agent System                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Discovery Layer                      │  │
│  │  scripts/skool-api-discover.ts                       │  │
│  │  - Interactive Playwright automation                  │  │
│  │  - Captures ALL API endpoints                        │  │
│  │  - Saves to migration-data/api-discovery/            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Agent Implementation                     │  │
│  │  lib/skool-agent.ts                                  │  │
│  │  - SkoolAgent class with all actions                 │  │
│  │  - Rate limiting enforcement                          │  │
│  │  - Error handling & retries                          │  │
│  │  - Stats tracking                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Convex Integration Layer                     │  │
│  │  convex/skoolAutomation.ts                           │  │
│  │  - Server-side actions                               │  │
│  │  - Webhook handlers                                  │  │
│  │  - Scheduled jobs                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Trigger Integrations                     │  │
│  │  - GitHub Webhooks (convex/githubWebhooks.ts)       │  │
│  │  - Discord Bot Integration                           │  │
│  │  - Custom Triggers                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: API Discovery ✅ COMPLETE

**Goal**: Capture all Skool API endpoints automatically

**Tool**: `scripts/skool-api-discover.ts`

**Actions Captured**:
1. ✅ Create post
2. ✅ Edit post
3. ✅ Delete post
4. ✅ Like post
5. ✅ Unlike post
6. ✅ Create comment
7. ✅ Reply to comment
8. ✅ Send DM
9. ✅ Follow user
10. ✅ Unfollow user
11. ✅ Search
12. ✅ Get notifications

**Output**: `migration-data/api-discovery/`
- `all-requests.json` - Complete request log
- `summary.json` - Quick overview
- `{action}.json` - Per-action details
- `skool-api-client.ts` - Generated TypeScript client

**Run**:
```bash
bun scripts/skool-api-discover.ts
```

### Phase 2: Core Agent Implementation ⏳ IN PROGRESS

**Goal**: Build working agent with all discovered endpoints

**File**: `lib/skool-agent.ts`

**Class Structure**:
```typescript
class SkoolAgent {
  // Configuration
  constructor(config: SkoolConfig)
  static fromEnv(): SkoolAgent

  // Authentication
  validateAuth(): Promise<AuthStatus>

  // Content Management
  createPost(post: SkoolPost): Promise<SkoolPostResponse>
  editPost(postId: string, updates: Partial<SkoolPost>): Promise<SkoolPostResponse>
  deletePost(postId: string): Promise<DeleteResult>

  // Engagement
  likePost(postId: string): Promise<ActionResult>
  unlikePost(postId: string): Promise<ActionResult>
  createComment(data: CreateCommentData): Promise<CommentResult>
  replyToComment(commentId: string, content: string, postId: string): Promise<CommentResult>

  // Social
  sendDM(data: SendDMData): Promise<DMResult>
  followUser(userId: string): Promise<ActionResult>
  unfollowUser(userId: string): Promise<ActionResult>

  // Discovery
  search(query: SearchQuery): Promise<SearchResult>
  getNotifications(): Promise<NotificationResult>

  // Utilities
  getStats(): AgentStats
}
```

**Next Steps**:
1. ⏳ Run discovery tool to capture exact endpoints
2. ⏳ Update method implementations with correct URLs and payloads
3. ⏳ Test each method individually
4. ⏳ Add comprehensive error handling

### Phase 3: Convex Integration ⏳ IN PROGRESS

**Goal**: Expose agent actions as Convex functions

**File**: `convex/skoolAutomation.ts`

**Available Actions**:
```typescript
// Already Implemented
api.skoolAutomation.testPost()
api.skoolAutomation.postGitHubRelease()
api.skoolAutomation.postDiscordHighlight()
api.skoolAutomation.checkTokenStatus()
api.skoolAutomation.getRateLimitStatus()

// To Add
api.skoolAutomation.likePost({ postId })
api.skoolAutomation.createComment({ postId, content })
api.skoolAutomation.sendDM({ userId, content })
api.skoolAutomation.followUser({ userId })
api.skoolAutomation.search({ query, type })
```

**Next Steps**:
1. ⏳ Add Convex actions for all agent methods
2. ⏳ Implement rate limiting per action type
3. ⏳ Add request queuing system
4. ⏳ Create admin dashboard queries

### Phase 4: Webhook & Trigger Integration ✅ COMPLETE

**Goal**: Connect external triggers to agent actions

**Webhooks Implemented**:
- ✅ GitHub Releases (`/github/release`)
- ✅ GitHub Stars (`/github/star`)

**To Add**:
- ⏳ Discord webhook integration
- ⏳ Slack webhook integration
- ⏳ Custom webhook endpoint
- ⏳ Scheduled posts via cron

### Phase 5: Intelligence & Optimization 🔮 FUTURE

**Goal**: Add AI-powered features

**Planned Features**:
- AI content generation using OpenAI
- Optimal posting time detection
- Engagement optimization
- Automatic reply generation
- Sentiment analysis
- Spam detection
- Content categorization

## Usage Examples

### Basic Post Creation

```typescript
import { createSkoolAgent } from '@/lib/skool-agent';

const agent = createSkoolAgent();

const result = await agent.createPost({
  title: "Weekly Update",
  content: "Here's what happened this week...",
  categoryId: "updates"
});

console.log(`Post created: ${result.url}`);
```

### Engagement Automation

```typescript
// Like posts from specific users
const posts = await getNewPostsFromFollowing();

for (const post of posts) {
  await agent.likePost(post.id);
  await agent.createComment({
    postId: post.id,
    content: "Great post! 👍"
  });

  // Rate limit: 2 seconds between actions
  await new Promise(r => setTimeout(r, 2000));
}
```

### DM Automation

```typescript
// Welcome new members
const newMembers = await getNewMembers();

for (const member of newMembers) {
  await agent.sendDM({
    userId: member.id,
    content: `
Welcome to the community, ${member.firstName}! 👋

Feel free to introduce yourself in #introductions.
Let me know if you have any questions!
    `.trim()
  });
}
```

### Search & Monitor

```typescript
// Monitor mentions
const results = await agent.search({
  query: "@myusername",
  type: "post",
  limit: 50
});

for (const post of results.results) {
  console.log(`Mentioned in: ${post.title}`);

  // Auto-reply to mentions
  await agent.createComment({
    postId: post.id,
    content: "Thanks for the mention!"
  });
}
```

### Notification Monitoring

```typescript
// Check notifications periodically
const notifications = await agent.getNotifications();

for (const notif of notifications.notifications || []) {
  if (!notif.read && notif.type === 'mention') {
    console.log(`New mention: ${notif.message}`);

    // Handle mention
    // ...
  }
}
```

### Batch Operations

```typescript
import { executeBatch } from '@/lib/skool-agent';

const agent = createSkoolAgent();

const actions = [
  () => agent.createPost({ title: "Post 1", content: "..." }),
  () => agent.createPost({ title: "Post 2", content: "..." }),
  () => agent.createPost({ title: "Post 3", content: "..." }),
];

// Execute with 2 second delay between each
const results = await executeBatch(agent, actions, 2000);

console.log(`${results.filter(r => r.success).length}/${results.length} succeeded`);
```

## Environment Configuration

### Required Variables

```bash
# Skool Authentication
SKOOL_GROUP_ID=your-group-id
SKOOL_GROUP_NAME=your-group-name
SKOOL_AUTH_TOKEN=your-jwt-token
SKOOL_CLIENT_ID=your-client-id
SKOOL_WAF_TOKEN=your-waf-token

# Optional: Category IDs
SKOOL_CATEGORY_RELEASES=category-id-1
SKOOL_CATEGORY_DISCORD=category-id-2

# Optional: GitHub webhook security
GITHUB_WEBHOOK_SECRET=your-secret
```

### Extracting Tokens

See `docs/SKOOL_AUTOMATION_SETUP.md` for detailed instructions.

Quick method:
1. Login to Skool
2. DevTools → Network → Filter: `api.skool.com`
3. Copy cookie values from any request

## Rate Limiting

### Limits by Action Type

| Action | Max/Hour | Enforced By |
|--------|----------|-------------|
| Posts | 60 | SkoolRateLimiter |
| Likes | 120 | SkoolRateLimiter |
| Comments | 80 | SkoolRateLimiter |
| DMs | 30 | SkoolRateLimiter |
| Follows | 50 | SkoolRateLimiter |
| Search | 200 | SkoolRateLimiter |

### Monitoring

```typescript
const limiter = new SkoolRateLimiter();
const status = limiter.getStatus();

console.log(`Requests in last hour: ${status.requestsInLastHour}`);
console.log(`Remaining: ${status.remainingRequests}`);
console.log(`Reset at: ${status.resetTime}`);
```

## Error Handling

### Common Errors

**401 Unauthorized**
- Token expired or invalid
- Solution: Refresh cookies from browser

**403 Forbidden**
- Insufficient permissions
- Solution: Check group membership and role

**429 Rate Limited**
- Too many requests
- Solution: Wait for reset time, reduce request frequency

**500 Server Error**
- Skool backend issue
- Solution: Retry with exponential backoff

### Retry Strategy

```typescript
// Built into agent methods
const result = await agent.retryWithBackoff(
  () => agent.createPost(postData),
  maxRetries = 3
);
```

## Testing

### Discovery Testing

```bash
# Run full discovery
bun scripts/skool-api-discover.ts

# Verify captured requests
cat migration-data/api-discovery/summary.json
```

### Unit Testing

```typescript
import { describe, it, expect } from 'bun:test';

describe('SkoolAgent', () => {
  it('should create a post', async () => {
    const agent = createSkoolAgent();
    const result = await agent.createPost({
      title: 'Test',
      content: 'Test content'
    });

    expect(result.success).toBe(true);
  });
});
```

### Integration Testing

Use a private test group:
1. Create private Skool group
2. Run all agent actions
3. Verify manually
4. Clean up test data

## Monitoring & Observability

### Agent Stats

```typescript
const stats = agent.getStats();

console.log({
  postsCreated: stats.postsCreated,
  likesGiven: stats.likesGiven,
  commentsCreated: stats.commentsCreated,
  dmsSent: stats.dmsSent,
  followsAdded: stats.followsAdded
});
```

### Logging

Add to agent methods:
```typescript
console.log('[SkoolAgent] Creating post:', postData.title);
console.log('[SkoolAgent] Post created:', result.id);
```

### Alerts

Set up alerts for:
- Authentication failures
- Rate limit exceeded
- Repeated errors
- Token expiration (< 7 days)

## Security Considerations

### Token Management

- ✅ Store in environment variables
- ✅ Never commit to git
- ✅ Rotate if exposed
- ✅ Monitor expiration
- ✅ Use dedicated automation account

### Rate Limiting

- ✅ Enforce limits to avoid bans
- ✅ Add delays between actions
- ✅ Monitor request counts
- ✅ Implement exponential backoff

### Content Moderation

- ✅ Review automated content before posting
- ✅ Add human approval for sensitive actions
- ✅ Implement spam detection
- ✅ Add kill switch for emergencies

## Roadmap

### v1.0 (Current)
- [x] API discovery tool
- [x] Basic agent implementation
- [x] Post creation
- [ ] Like/unlike functionality
- [ ] Comment creation
- [ ] DM functionality

### v2.0 (Next Month)
- [ ] Complete all agent methods
- [ ] Comprehensive test suite
- [ ] Admin dashboard
- [ ] Webhook integrations
- [ ] Scheduled posting

### v3.0 (Future)
- [ ] AI content generation
- [ ] Engagement optimization
- [ ] Analytics dashboard
- [ ] Multi-group support
- [ ] Team collaboration

## Resources

- **Specification**: `docs/SKOOL_API_SPEC.md`
- **Setup Guide**: `docs/SKOOL_AUTOMATION_SETUP.md`
- **Technical Guide**: `docs/SKOOL_POSTING_GUIDE.md`
- **Quick Start**: `SKOOL_AUTOMATION_README.md`

## Support

**Issues**: Check existing documentation first
**Updates**: Run discovery tool after Skool updates
**Contributing**: See implementation phases above

---

**Status**: Active Development
**Last Updated**: 2025-09-30
**Version**: 1.0.0-beta
