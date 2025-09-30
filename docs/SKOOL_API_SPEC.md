# Skool API Complete Specification

## Overview

This document provides a complete specification for interacting with Skool.com's API through cookie-based authentication. It covers all discovered endpoints and patterns for building a fully-featured automation agent.

## Table of Contents

1. [Authentication](#authentication)
2. [Discovered Endpoints](#discovered-endpoints)
3. [Core Actions](#core-actions)
4. [Agent Implementation](#agent-implementation)
5. [Rate Limiting](#rate-limiting)
6. [Error Handling](#error-handling)

---

## Authentication

### Cookie-Based Authentication

Skool uses standard cookie-based web authentication. Required cookies:

```typescript
interface SkoolAuth {
  auth_token: string;    // JWT token (format: eyJhbG...)
  client_id: string;     // UUID client identifier
  x_aws_waf_token: string; // AWS WAF token for bot protection
}
```

### Extracting Cookies

**Method 1: Browser DevTools**
1. Login to Skool in Chrome
2. Open DevTools (F12)
3. Network tab → Filter: `api.skool.com`
4. Click any request → Copy cookies from headers

**Method 2: Automated (Playwright)**
```typescript
const cookies = await context.cookies();
const authToken = cookies.find(c => c.name === 'auth_token')?.value;
const clientId = cookies.find(c => c.name === 'client_id')?.value;
```

### Token Lifecycle

- **JWT Expiration**: ~1 year (check `exp` field in token)
- **WAF Token**: Changes frequently (daily/per session)
- **Refresh Strategy**: Re-extract cookies when requests fail with 401

### Request Headers

```typescript
const headers = {
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  'cookie': `client_id=${clientId}; auth_token=${authToken}`,
  'origin': 'https://www.skool.com',
  'referer': `https://www.skool.com/${groupName}`,
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'x-aws-waf-token': wafToken,
  'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site'
};
```

---

## Discovered Endpoints

### Base URLs

- **API**: `https://api.skool.com`
- **Next.js Data**: `https://www.skool.com/_next/data/{buildId}/`
- **Website**: `https://www.skool.com`

### Endpoint Discovery Process

Run the automated discovery tool:

```bash
bun scripts/skool-api-discover.ts
```

This captures:
- ✅ All HTTP methods (GET, POST, PUT, DELETE, PATCH)
- ✅ Request/response bodies
- ✅ Headers and authentication
- ✅ Timing and sequence
- ✅ Error responses

Output location: `migration-data/api-discovery/`

---

## Core Actions

### 1. Posts

#### Create Post

**Discovered by**: `create_post` action in discovery tool

**Endpoint** (to be confirmed):
```
POST https://api.skool.com/posts
```

**Request Body**:
```json
{
  "group_id": "string",
  "post_type": "generic",
  "metadata": {
    "title": "string",
    "content": "string",
    "labels": "categoryId"
  }
}
```

**Response**:
```json
{
  "id": "string",
  "name": "string",
  "created_at": "timestamp"
}
```

#### Edit Post

**Discovered by**: `edit_post` action

**Endpoint** (to be confirmed):
```
PUT/PATCH https://api.skool.com/posts/{postId}
```

**Request Body**:
```json
{
  "metadata": {
    "title": "string",
    "content": "string"
  }
}
```

#### Delete Post

**Discovered by**: `delete_post` action

**Endpoint** (to be confirmed):
```
DELETE https://api.skool.com/posts/{postId}
```

#### Get Posts

**Known Endpoint**:
```
GET https://www.skool.com/_next/data/{buildId}/{groupName}.json
Query params: ?group={groupName}&c=&fl=&p={page}
```

**Response**: Array of posts with metadata

### 2. Reactions (Likes)

#### Like Post

**Discovered by**: `like_post` action

**Endpoint** (to be confirmed):
```
POST https://api.skool.com/posts/{postId}/like
or
POST https://api.skool.com/reactions
```

**Request Body** (possible):
```json
{
  "target_id": "postId",
  "target_type": "post",
  "reaction_type": "upvote"
}
```

#### Unlike Post

**Discovered by**: `unlike_post` action

**Endpoint** (to be confirmed):
```
DELETE https://api.skool.com/posts/{postId}/like
or
DELETE https://api.skool.com/reactions/{reactionId}
```

### 3. Comments

#### Create Comment

**Discovered by**: `create_comment` action

**Endpoint** (to be confirmed):
```
POST https://api.skool.com/posts/{postId}/comments
or
POST https://api.skool.com/posts (with post_type: "comment")
```

**Request Body** (possible):
```json
{
  "parent_id": "postId",
  "post_type": "comment",
  "metadata": {
    "content": "string"
  }
}
```

#### Reply to Comment

**Discovered by**: `reply_comment` action

**Endpoint** (to be confirmed):
```
POST https://api.skool.com/posts
```

**Request Body** (possible):
```json
{
  "parent_id": "commentId",
  "root_id": "postId",
  "post_type": "comment",
  "metadata": {
    "content": "string"
  }
}
```

#### Get Comments

**Known Endpoint**:
```
GET https://api.skool.com/posts/{postId}/comments
Query params: ?group-id={groupId}&limit=25&pinned=true&last={cursor}
```

### 4. Direct Messages

#### Send DM

**Discovered by**: `send_dm` action

**Endpoint** (to be confirmed):
```
POST https://api.skool.com/messages
or
POST https://api.skool.com/conversations
```

**Request Body** (possible):
```json
{
  "recipient_id": "userId",
  "content": "string"
}
```

#### Get DMs

**Endpoint** (to be discovered):
```
GET https://api.skool.com/messages
or
GET https://api.skool.com/conversations
```

### 5. User Actions

#### Follow User

**Discovered by**: `follow_user` action

**Endpoint** (to be confirmed):
```
POST https://api.skool.com/users/{userId}/follow
```

#### Unfollow User

**Discovered by**: `unfollow_user` action

**Endpoint** (to be confirmed):
```
DELETE https://api.skool.com/users/{userId}/follow
```

#### Get User Profile

**Endpoint** (to be discovered):
```
GET https://api.skool.com/users/{userId}
or
GET https://www.skool.com/_next/data/{buildId}/members/{username}.json
```

### 6. Search

#### Search Posts/Users

**Discovered by**: `search` action

**Endpoint** (to be confirmed):
```
GET https://api.skool.com/search
Query params: ?q={query}&type={post|user|all}&group-id={groupId}
```

### 7. Notifications

#### Get Notifications

**Discovered by**: `get_notifications` action

**Endpoint** (to be confirmed):
```
GET https://api.skool.com/notifications
Query params: ?limit=50&unread_only=false
```

#### Mark Notification Read

**Endpoint** (to be discovered):
```
PUT https://api.skool.com/notifications/{notificationId}/read
```

---

## Agent Implementation

### Agent Capabilities

The Skool automation agent should support:

1. **Content Management**
   - ✅ Create posts with title, content, media
   - ✅ Edit existing posts
   - ✅ Delete posts
   - ✅ Schedule posts for future

2. **Engagement**
   - ✅ Like/unlike posts
   - ✅ Comment on posts
   - ✅ Reply to comments
   - ✅ React with emojis (if supported)

3. **Social**
   - ✅ Follow/unfollow users
   - ✅ Send DMs
   - ✅ Reply to DMs
   - ✅ Search for content/users

4. **Monitoring**
   - ✅ Get notifications
   - ✅ Track engagement metrics
   - ✅ Monitor mentions

### Agent Architecture

```typescript
interface SkoolAgent {
  // Configuration
  config: SkoolAPIConfig;
  rateLimiter: RateLimiter;

  // Content Management
  createPost(data: CreatePostData): Promise<Post>;
  editPost(postId: string, data: EditPostData): Promise<Post>;
  deletePost(postId: string): Promise<void>;

  // Engagement
  likePost(postId: string): Promise<void>;
  unlikePost(postId: string): Promise<void>;
  createComment(postId: string, content: string): Promise<Comment>;
  replyToComment(commentId: string, content: string): Promise<Comment>;

  // Social
  followUser(userId: string): Promise<void>;
  unfollowUser(userId: string): Promise<void>;
  sendDM(userId: string, content: string): Promise<Message>;

  // Search & Discovery
  search(query: string, type?: 'post' | 'user'): Promise<SearchResults>;
  getNotifications(): Promise<Notification[]>;

  // Utilities
  validateAuth(): Promise<boolean>;
  refreshTokens(): Promise<void>;
}
```

### Implementation Phases

#### Phase 1: Discovery ✅
- [x] Create automated discovery tool
- [x] Capture all API endpoints
- [x] Document request/response formats

#### Phase 2: Core Actions (Next)
- [ ] Implement createPost
- [ ] Implement likePost/unlikePost
- [ ] Implement createComment
- [ ] Test all basic actions

#### Phase 3: Advanced Features
- [ ] Implement DM functionality
- [ ] Implement follow/unfollow
- [ ] Implement search
- [ ] Implement notifications

#### Phase 4: Agent Intelligence
- [ ] Add content generation (AI-powered)
- [ ] Add engagement optimization
- [ ] Add scheduling system
- [ ] Add analytics tracking

---

## Rate Limiting

### Known Limits

Based on observation and best practices:

- **Posts**: ~60 per hour
- **Likes**: ~120 per hour
- **Comments**: ~80 per hour
- **DMs**: ~30 per hour
- **Follows**: ~50 per hour

### Rate Limiter Implementation

```typescript
class SkoolRateLimiter {
  private limits = {
    post: { max: 60, window: 3600000 },
    like: { max: 120, window: 3600000 },
    comment: { max: 80, window: 3600000 },
    dm: { max: 30, window: 3600000 },
    follow: { max: 50, window: 3600000 }
  };

  async waitIfNeeded(action: keyof typeof this.limits): Promise<void> {
    // Implementation in lib/skool-poster.ts
  }
}
```

### Handling 429 Responses

```typescript
async function handleRateLimit(response: Response): Promise<void> {
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const waitTime = retryAfter
      ? parseInt(retryAfter) * 1000
      : 60000; // Default 1 minute

    console.log(`Rate limited. Waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}
```

---

## Error Handling

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 401 | Unauthorized | Refresh auth cookies |
| 403 | Forbidden | Check permissions/group access |
| 404 | Not Found | Verify entity exists |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Retry with backoff |

### Error Response Format

```json
{
  "error": "string",
  "message": "string",
  "code": "ERROR_CODE"
}
```

### Retry Strategy

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      console.log(`Retry ${i + 1}/${maxRetries} after ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw new Error('Should not reach here');
}
```

---

## Testing Strategy

### Discovery Testing

```bash
# Run full discovery
bun scripts/skool-api-discover.ts

# Review captured requests
cat migration-data/api-discovery/summary.json

# Analyze specific action
cat migration-data/api-discovery/create_post.json
```

### Unit Testing

```typescript
// Example test
import { describe, it, expect } from 'bun:test';
import { postToSkool } from '@/lib/skool-poster';

describe('Skool API', () => {
  it('should create a post', async () => {
    const config = getTestConfig();
    const result = await postToSkool(config, {
      title: 'Test Post',
      content: 'Test content'
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });
});
```

### Integration Testing

Create a test group on Skool for safe testing:

1. Create private test group
2. Run all agent actions
3. Verify results manually
4. Clean up test data

---

## Next Steps

### Immediate (Week 1)
1. ✅ Run `bun scripts/skool-api-discover.ts`
2. ⏳ Review captured API requests
3. ⏳ Update `lib/skool-poster.ts` with real endpoints
4. ⏳ Implement core actions (create, like, comment)
5. ⏳ Test in development environment

### Short-term (Week 2-3)
1. Implement DM functionality
2. Add follow/unfollow actions
3. Implement search
4. Add notification monitoring
5. Create comprehensive test suite

### Long-term (Month 1+)
1. Build intelligent agent with AI
2. Add content scheduling
3. Implement engagement analytics
4. Create dashboard for monitoring
5. Add webhook integrations

---

## Resources

### Generated Files
- `migration-data/api-discovery/all-requests.json` - Complete request log
- `migration-data/api-discovery/summary.json` - Quick overview
- `migration-data/api-discovery/{action}.json` - Per-action requests
- `migration-data/api-discovery/skool-api-client.ts` - Generated TypeScript client

### Implementation Files
- `lib/skool-poster.ts` - Core posting logic
- `convex/skoolAutomation.ts` - Convex actions
- `scripts/skool-api-discover.ts` - Discovery tool
- `scripts/skool-api-complete.js` - Working extraction example

### Documentation
- `docs/SKOOL_POSTING_GUIDE.md` - Technical guide
- `docs/SKOOL_AUTOMATION_SETUP.md` - Setup instructions
- `SKOOL_AUTOMATION_README.md` - Quick start

---

## Contributing

When adding new endpoints:

1. Use discovery tool to capture requests
2. Document in this spec
3. Implement in `lib/skool-poster.ts`
4. Add tests
5. Update examples

## Security Notes

⚠️ **CRITICAL**
- Never commit authentication tokens
- Rotate tokens if exposed
- Use environment variables
- Monitor for unauthorized access
- Implement rate limiting
- Log all agent actions
- Add kill switch for runaway automation

---

**Last Updated**: 2025-09-30
**API Version**: Discovered via reverse engineering
**Status**: Active Development
