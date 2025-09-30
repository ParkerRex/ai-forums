# Skool Posting Automation Guide

## Overview

This guide documents how to programmatically post to Skool.com using cookie-based authentication. This is useful for automating content creation from external triggers like GitHub releases or Discord messages.

## Authentication Methods

### 1. Cookie-Based Authentication (Recommended for Automation)

Based on the existing `scripts/skool-api-complete.js`, we can authenticate using browser cookies:

```javascript
const headers = {
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  'cookie': `client_id=${clientId}; auth_token=${authToken}`,
  'origin': 'https://www.skool.com',
  'referer': 'https://www.skool.com/',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'x-aws-waf-token': wafToken,
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site'
}
```

**Required Cookies:**
- `auth_token` - JWT authentication token (format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
- `client_id` - Client identifier UUID
- `x-aws-waf-token` - AWS WAF token for bot protection

**How to Extract Cookies:**
1. Log into Skool.com in your browser
2. Open DevTools → Network tab
3. Filter for requests to `api.skool.com`
4. Copy the `auth_token`, `client_id`, and `x-aws-waf-token` values from request headers

**Token Expiration:**
- The JWT `auth_token` contains an `exp` field with Unix timestamp
- From the example in `skool-api-complete.js`:
  - `exp: 1779390424` (May 2026)
  - `iat: 1747854424` (May 2025)
- Tokens appear to have ~1 year validity

### 2. Zapier API Key (Limited)

Official Zapier integration for Pro plan users:
- Location: Group Settings → Plugins → Zapier
- Capabilities: Limited to specific triggers/actions
- Not suitable for custom post creation

### 3. Third-Party SkoolAPI (Early Stage)

Third-party API at `docs.skoolapi.com`:
- Uses `X-Api-Secret` header authentication
- Still in early development
- Limited endpoint coverage
- Not recommended for production use

## Skool API Endpoints

### Known Endpoints (From Reverse Engineering)

#### 1. Get Posts (with pagination)
```
GET https://www.skool.com/_next/data/{buildId}/{groupName}.json
Query Parameters:
  - group={groupName}
  - c=                    # category filter (empty for all)
  - fl=                   # filter type
  - p={pageNumber}        # page number (omit for page 1)
```

#### 2. Get Comments for Post
```
GET https://api.skool.com/posts/{postId}/comments
Query Parameters:
  - group-id={groupId}    # required
  - limit=25              # hardcoded by Skool
  - pinned=true           # include pinned comments
  - last={cursor}         # pagination cursor (omit for first page)
```

#### 3. Create Post (Reverse Engineered)
```
POST https://api.skool.com/posts
Headers:
  - Content-Type: application/json
  - Cookie: auth_token={token}; client_id={id}
  - x-aws-waf-token: {wafToken}

Body (Likely Structure):
{
  "group_id": "string",
  "post_type": "generic",
  "metadata": {
    "title": "string",
    "content": "string",
    "labels": "categoryId" // optional
  }
}
```

**Note:** The exact POST endpoint and payload structure need to be confirmed by monitoring browser requests when creating a post manually.

## Implementation Strategy

### Phase 1: Capture Post Creation Request

Create a test script to capture the actual POST request:

```javascript
// scripts/capture-skool-post.js
const puppeteer = require('puppeteer');

async function capturePostRequest() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Capture network requests
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('api.skool.com/posts') &&
        request.method() === 'POST') {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      });
    }
  });

  // Login and navigate to group
  await page.goto('https://www.skool.com/login');
  // ... manual login ...

  // User manually creates a post
  console.log('Create a post manually now...');
  await page.waitForTimeout(60000); // 1 minute to create post

  // Save captured request
  console.log('Captured requests:', JSON.stringify(requests, null, 2));

  await browser.close();
}
```

### Phase 2: Create Posting Function

Once we have the correct endpoint and payload:

```javascript
// lib/skool-poster.js
async function postToSkool(config, postData) {
  const url = 'https://api.skool.com/posts'; // Confirm this endpoint

  const headers = {
    'accept': '*/*',
    'content-type': 'application/json',
    'cookie': `client_id=${config.clientId}; auth_token=${config.authToken}`,
    'origin': 'https://www.skool.com',
    'referer': `https://www.skool.com/${config.groupName}`,
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'x-aws-waf-token': config.wafToken,
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site'
  };

  const body = {
    group_id: config.groupId,
    post_type: 'generic',
    metadata: {
      title: postData.title,
      content: postData.content,
      labels: postData.categoryId // optional
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Failed to post: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}
```

### Phase 3: Integration with Triggers

#### GitHub Release → Skool Post

```javascript
// convex/githubWebhook.ts
import { httpAction } from "./_generated/server";
import { httpRouter } from "convex/server";

const http = httpRouter();

http.route({
  path: "/github/release",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const payload = await req.json();

    if (payload.action === "published") {
      const release = payload.release;

      // Queue post to Skool
      await ctx.scheduler.runAfter(0, internal.skool.createPost, {
        title: `New Release: ${release.name}`,
        content: `
## ${release.name}

${release.body}

[View Release on GitHub](${release.html_url})
        `,
        categoryId: "releases"
      });
    }

    return new Response(null, { status: 200 });
  })
});

export default http;
```

#### Discord Message → Skool Post

```javascript
// convex/discordToSkool.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const postDiscordHighlight = action({
  args: {
    messageId: v.string(),
    channelName: v.string(),
    content: v.string(),
    author: v.object({
      username: v.string(),
      avatar: v.optional(v.string())
    }),
    reactionCount: v.number()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Only post messages with high engagement (e.g., 5+ reactions)
    if (args.reactionCount < 5) return null;

    const skoolConfig = {
      authToken: process.env.SKOOL_AUTH_TOKEN,
      clientId: process.env.SKOOL_CLIENT_ID,
      wafToken: process.env.SKOOL_WAF_TOKEN,
      groupId: process.env.SKOOL_GROUP_ID,
      groupName: process.env.SKOOL_GROUP_NAME
    };

    const postData = {
      title: `🔥 Hot Take from #${args.channelName}`,
      content: `
${args.content}

— ${args.author.username} in Discord

_This message got ${args.reactionCount} reactions!_
      `,
      categoryId: "discord-highlights"
    };

    // Post to Skool
    await postToSkool(skoolConfig, postData);

    return null;
  }
});
```

## Environment Variables

Add to `.env.local`:

```bash
# Skool Authentication
SKOOL_GROUP_ID=d712a2ce0a0d41c891c4949ab68373b2
SKOOL_GROUP_NAME=troublefreeai
SKOOL_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SKOOL_CLIENT_ID=6940c2e8ef534532a4f0bfd1af9c52de
SKOOL_WAF_TOKEN=100727f2-d70d-4d87-ad17-1af681df4e72:FAoAvluR...

# Category IDs (get from Skool)
SKOOL_CATEGORY_RELEASES=...
SKOOL_CATEGORY_DISCORD_HIGHLIGHTS=...
```

## Rate Limiting & Best Practices

1. **Rate Limiting**
   - Add delays between posts (500ms-1000ms)
   - Don't exceed 60 posts per hour
   - Monitor for 429 (Too Many Requests) responses

2. **Token Refresh**
   - Monitor JWT expiration date
   - Set up alert 7 days before expiration
   - Use cron job to check token validity

3. **Error Handling**
   - Retry failed posts with exponential backoff
   - Log all API responses for debugging
   - Store failed posts in database for manual review

4. **Content Formatting**
   - Skool uses markdown for formatting
   - Support @mentions using `@username` format
   - Images can be embedded using markdown image syntax

## Testing Strategy

1. **Manual Testing**
   - Use Postman/curl to test API calls
   - Verify authentication works
   - Test different post formats

2. **Automated Testing**
   - Create test environment with test group
   - Verify posts appear correctly
   - Test error handling

3. **Monitoring**
   - Log all post attempts
   - Track success/failure rates
   - Alert on authentication failures

## Next Steps

1. ✅ Document existing cookie-based authentication
2. ⏳ Capture actual POST request structure (use Puppeteer)
3. ⏳ Implement posting function
4. ⏳ Create GitHub webhook integration
5. ⏳ Create Discord highlight automation
6. ⏳ Set up token refresh monitoring
7. ⏳ Add comprehensive error handling

## Troubleshooting

### Authentication Issues

**Problem:** 401 Unauthorized
- **Solution:** Refresh your cookies from browser
- **Check:** Ensure WAF token is current (changes frequently)

**Problem:** 403 Forbidden
- **Solution:** Verify you have posting permissions in the group
- **Check:** Group settings → Member permissions

### WAF Token Issues

**Problem:** WAF token expires quickly
- **Solution:** Extract fresh token before each post
- **Implementation:** Add token refresh logic to posting function

### Post Not Appearing

**Problem:** API returns 200 but post not visible
- **Solution:** Check if post is in moderation queue
- **Check:** Verify categoryId is valid

## References

- Existing extraction script: `scripts/skool-api-complete.js`
- Migration data: `migration-data/`
- Import summary: `migration-data/import-summary.md`
- Skool Zapier docs: https://help.skool.com/article/56-zapier-integration
- Third-party API: https://docs.skoolapi.com/

## Security Considerations

⚠️ **NEVER commit tokens to git**
- Use environment variables
- Add `.env.local` to `.gitignore`
- Rotate tokens if accidentally exposed
- Use secret management service in production

⚠️ **Token Sharing**
- Tokens are tied to your user account
- Anyone with token can post as you
- Don't share tokens with untrusted parties
- Consider creating dedicated automation account
