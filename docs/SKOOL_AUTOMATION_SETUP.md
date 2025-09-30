# Skool Automation Setup Guide

## Quick Start

This guide will help you set up automated posting to Skool from GitHub releases and Discord messages.

## Prerequisites

- Active Skool account with posting permissions
- Skool group where you want to post
- Access to browser DevTools to extract cookies

## Step 1: Capture Skool POST Request (Required)

Before automation works, we need to capture the exact POST request structure Skool uses:

```bash
# Install puppeteer if not already installed
npm install puppeteer

# Run the capture script
node scripts/capture-skool-post-request.js
```

**What to do:**
1. Script opens browser
2. Login to Skool
3. Navigate to your group
4. Create a test post (any content)
5. Script captures the request and saves to `migration-data/skool-post-request-captured.json`

**Update lib/skool-poster.ts:**
Once captured, update the `postToSkool` function with the correct endpoint URL and payload structure.

## Step 2: Extract Authentication Cookies

### Using Browser DevTools

1. **Login to Skool** in Chrome/Firefox
2. **Open DevTools** (F12 or Cmd+Option+I)
3. **Go to Network tab**
4. **Filter by** `api.skool.com`
5. **Click on any request** to api.skool.com
6. **Copy these values** from Request Headers:

   - `cookie` header → Extract:
     - `auth_token=eyJhbGc...` (JWT token)
     - `client_id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (UUID)
   - `x-aws-waf-token` header → Copy entire value

### Example Values

```
auth_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NzkzOTA0MjQsImlhdCI6MTc0Nzg1NDQyNCwidXNlcl9pZCI6IjllMWRjY2VkZGIwYTRmOWRiNzYyNWUyZjAwNjgwYTRiIn0.uEDBvOi1gCUmytU9jrCL4t5IpN0sTuIVxNmK2IhJ7O0

client_id: 6940c2e8ef534532a4f0bfd1af9c52de

x-aws-waf-token: 100727f2-d70d-4d87-ad17-1af681df4e72:FAoAvluRLmR8AAAA:V902/EZ+NIDGz4R0...
```

## Step 3: Configure Environment Variables

Add to your `.env.local` file:

```bash
# ===================================
# Skool Automation Configuration
# ===================================

# Your Skool group details
SKOOL_GROUP_ID=d712a2ce0a0d41c891c4949ab68373b2
SKOOL_GROUP_NAME=troublefreeai

# Authentication cookies (extract from browser)
SKOOL_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SKOOL_CLIENT_ID=6940c2e8ef534532a4f0bfd1af9c52de
SKOOL_WAF_TOKEN=100727f2-d70d-4d87-ad17-1af681df4e72:FAoAvluR...

# Optional: Category IDs for different post types
SKOOL_CATEGORY_RELEASES=c321eee60c31488aa0264144485f2296
SKOOL_CATEGORY_DISCORD_HIGHLIGHTS=...

# Optional: GitHub webhook verification
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here
```

### Getting Group ID and Name

- **Group Name**: From URL `https://www.skool.com/{groupName}`
- **Group ID**: Use the value from `scripts/skool-api-complete.js` or inspect network requests

## Step 4: Test the Connection

Run the test function in Convex dashboard:

```javascript
// In Convex dashboard Functions tab
api.skoolAutomation.testPost({
  title: "🧪 Test Post",
  content: "Testing automated posting!"
})
```

Expected response:
```json
{
  "success": true,
  "postId": "...",
  "postUrl": "https://www.skool.com/troublefreeai/test-post"
}
```

## Step 5: Set Up GitHub Webhook

### In Your GitHub Repository

1. Go to **Settings → Webhooks → Add webhook**

2. Configure:
   - **Payload URL**: `https://your-app.convex.site/github/release`
   - **Content type**: `application/json`
   - **Secret**: (Optional) Add to `GITHUB_WEBHOOK_SECRET`
   - **Events**: Select "Releases"
   - **Active**: ✅ Check

3. Click **Add webhook**

### Get Your Convex Site URL

```bash
# From your terminal
npx convex env get CONVEX_SITE_URL

# Or check Convex dashboard → Settings → Deployment
```

### Test the Webhook

Create a test release on GitHub:

1. Go to **Releases → Draft a new release**
2. Fill in details
3. Click **Publish release**
4. Check Skool for the automated post!

## Step 6: Set Up Discord Integration (Optional)

### Monitor Discord for High-Engagement Messages

Add to your Discord bot code:

```typescript
// In your Discord bot
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.CONVEX_URL);

client.on('messageReactionAdd', async (reaction, user) => {
  // Only check complete reactions
  if (reaction.partial) {
    await reaction.fetch();
  }

  // Count total reactions
  const totalReactions = reaction.message.reactions.cache.reduce(
    (sum, r) => sum + r.count,
    0
  );

  // Trigger posting if threshold met (e.g., 5+ reactions)
  if (totalReactions >= 5) {
    await convex.mutation(api.skoolAutomation.postDiscordHighlight, {
      messageId: reaction.message.id,
      content: reaction.message.content,
      author: {
        username: reaction.message.author.username,
        avatar: reaction.message.author.displayAvatarURL()
      },
      channelName: reaction.message.channel.name,
      reactionCount: totalReactions,
      timestamp: reaction.message.createdAt.toISOString()
    });
  }
});
```

## Monitoring & Maintenance

### Check Token Status

Run in Convex dashboard:

```javascript
api.skoolAutomation.checkTokenStatus({})
```

Response:
```json
{
  "valid": true,
  "expiresAt": "2026-05-01T00:00:00.000Z",
  "daysUntilExpiration": 365,
  "needsRefresh": false
}
```

### Check Rate Limits

```javascript
api.skoolAutomation.getRateLimitStatus({})
```

Response:
```json
{
  "requestsInLastHour": 12,
  "remainingRequests": 48,
  "resetTime": "2025-07-01T15:00:00.000Z"
}
```

### Set Up Token Expiration Alert

Create a cron job in `convex/crons.ts`:

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check token status daily
crons.interval(
  "check skool token",
  { hours: 24 },
  internal.skoolAutomation.checkTokenStatus,
  {}
);

export default crons;
```

## Troubleshooting

### "Failed to post: 401 Unauthorized"

**Cause**: Invalid or expired authentication token

**Fix**:
1. Extract fresh cookies from browser
2. Update `.env.local` with new values
3. Restart Convex dev server

### "Failed to post: 403 Forbidden"

**Cause**: No posting permission in group

**Fix**:
1. Verify you can post manually in Skool
2. Check if group has posting restrictions
3. Contact group admin for permissions

### "WAF token invalid"

**Cause**: AWS WAF token expired (changes frequently)

**Fix**:
1. Extract fresh `x-aws-waf-token` from browser
2. Update `.env.local`
3. Consider implementing automatic token refresh

### Post appears but formatting is broken

**Cause**: Markdown syntax not supported by Skool

**Fix**:
1. Test different markdown features manually
2. Update formatting functions in `lib/skool-poster.ts`
3. Avoid unsupported syntax (e.g., tables, footnotes)

## Best Practices

### 1. Token Security

- ✅ **DO**: Store tokens in environment variables
- ✅ **DO**: Add `.env.local` to `.gitignore`
- ❌ **DON'T**: Commit tokens to git
- ❌ **DON'T**: Share tokens in public channels

### 2. Rate Limiting

- Post max 60 times per hour
- Add delays between posts (500ms minimum)
- Monitor rate limit status
- Handle 429 errors gracefully

### 3. Content Quality

- Preview posts before automation
- Add context about automation source
- Use consistent formatting
- Include links to original source

### 4. Error Handling

- Log all API responses
- Store failed posts for retry
- Alert on repeated failures
- Monitor token expiration

## Advanced Usage

### Custom Post Formatting

Create custom formatters in `lib/skool-poster.ts`:

```typescript
export function formatCustomEventForSkool(event: YourEvent): SkoolPost {
  return {
    title: `🎉 ${event.title}`,
    content: `
${event.description}

🔗 [Learn More](${event.url})
    `.trim()
  };
}
```

### Scheduled Posts

Use Convex scheduled functions:

```typescript
// Schedule a post for specific time
await ctx.scheduler.runAt(
  new Date("2025-07-01T12:00:00Z").getTime(),
  internal.skoolAutomation.postGitHubRelease,
  { /* args */ }
);
```

### Batch Posting

Post multiple items with rate limiting:

```typescript
for (const item of items) {
  await ctx.scheduler.runAfter(
    index * 2000, // 2 second delay between posts
    internal.skoolAutomation.postGitHubRelease,
    { /* args */ }
  );
}
```

## Resources

- **Documentation**: `docs/SKOOL_POSTING_GUIDE.md`
- **Implementation**: `lib/skool-poster.ts`
- **Convex Actions**: `convex/skoolAutomation.ts`
- **GitHub Webhooks**: `convex/githubWebhooks.ts`
- **Capture Script**: `scripts/capture-skool-post-request.js`
- **Example Data**: `scripts/skool-api-complete.js`

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review captured request data
3. Test manually in Convex dashboard
4. Check Convex logs for errors
5. Verify all environment variables are set

## Next Steps

Once setup is complete:

- [ ] Test posting manually
- [ ] Set up GitHub webhook
- [ ] Configure Discord integration (optional)
- [ ] Set up token expiration monitoring
- [ ] Create custom formatters for your use case
- [ ] Document your specific category IDs
- [ ] Set up error alerting
