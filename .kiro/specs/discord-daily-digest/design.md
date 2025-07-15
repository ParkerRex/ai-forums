# Design Document

## Overview

The Discord Daily Digest Integration extends the existing Phase 0 news feed infrastructure to include Discord messages from the VAI VEX Discord server. The system will fetch messages from the previous day, rank them by reaction count, and seamlessly integrate them into the existing news feed architecture. This design leverages the established modular source system, dual-layer caching, and user preference management while adding Discord-specific functionality.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[News Feed UI]
        Settings[Settings UI]
        DiscordPage[Discord Digest Page]
    end
    
    subgraph "Hook Layer"
        NewsFeedHook[use-news-feed.ts]
        DiscordHook[use-discord-digest.ts]
    end
    
    subgraph "API Layer"
        NewsFeedAPI[convex/newsFeed.ts]
        DiscordAPI[convex/discord.ts]
        SourcesAPI[convex/newsFeedSources.ts]
    end
    
    subgraph "Source Layer"
        DiscordSource[discord.ts]
        ExistingSources[Other Sources]
    end
    
    subgraph "External Services"
        DiscordBot[Discord Bot API]
        ExaAPI[Exa Summarization]
    end
    
    UI --> NewsFeedHook
    Settings --> SourcesAPI
    DiscordPage --> DiscordHook
    NewsFeedHook --> NewsFeedAPI
    DiscordHook --> DiscordAPI
    NewsFeedAPI --> DiscordSource
    DiscordSource --> DiscordBot
    DiscordSource --> ExaAPI
```

### Integration with Existing Architecture

The design builds upon the established Phase 0 infrastructure:

- **Modular Source System**: Discord becomes a new source type in `features/news/utils/news-sources/`
- **Dual-Layer Caching**: Discord data uses existing `newsFeedCache` table and localStorage patterns
- **User Preferences**: Extends existing news preferences system in member schema
- **NewsItem Interface**: Discord messages conform to existing `NewsItem` structure
- **Error Handling**: Follows established patterns for graceful degradation

## Components and Interfaces

### Core Components

#### 1. Discord Source Module (`features/news/utils/news-sources/discord.ts`)

```typescript
export interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  timestamp: string;
  reactions: Array<{
    emoji: string;
    count: number;
  }>;
  channelId: string;
  channelName: string;
}

export interface DiscordSourceConfig extends NewsSource {
  type: "discord";
  guildId: string;
  channels?: string[]; // Optional channel filtering
}

export async function fetchItems(source: DiscordSourceConfig): Promise<RawItem[]>
```

#### 2. Discord API Integration (`convex/discord.ts`)

```typescript
export const fetchDiscordMessages = action({
  args: {
    guildId: v.string(),
    channels: v.optional(v.array(v.string())),
    since: v.number(), // Unix timestamp for "yesterday"
  },
  handler: async (ctx, args): Promise<DiscordMessage[]>
});

export const getDiscordDigest = action({
  args: {
    userId: v.optional(v.id("members")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<NewsItem[]>
});
```

#### 3. User Preferences Storage (`convex/newsFeedSources.ts`)

```typescript
export const updateDiscordPreferences = mutation({
  args: {
    userId: v.id("members"),
    enabled: v.boolean(),
    channels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args)
});

export const getDiscordPreferences = query({
  args: {
    userId: v.id("members"),
  },
  handler: async (ctx, args)
});
```

#### 4. Settings UI Components

- `app/settings/news-sources/page.tsx` - Main settings page
- `components/news/news-source-form.tsx` - Reusable form component
- `components/news/discord-settings.tsx` - Discord-specific settings

#### 5. Discord Digest Hook (`hooks/use-discord-digest.ts`)

```typescript
export function useDiscordDigest() {
  const [messages, setMessages] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const refresh = useCallback(async () => {
    // Fetch Discord-only content
  }, []);
  
  return { messages, loading, error, refresh };
}
```

### Extended Interfaces

#### Updated NewsSource Type

```typescript
export type SourceType = "rss" | "youtube" | "podcast" | "blog" | "x" | "website" | "discord";

export interface DiscordNewsSource extends NewsSource {
  type: "discord";
  guildId: string;
  channels?: string[];
}
```

#### Enhanced Member Schema

```typescript
// Extension to existing newsPreferences in members table
newsPreferences: v.optional(v.object({
  enabledCategories: v.array(v.string()),
  customSources: v.array(v.object({
    type: v.union(
      v.literal("repository"),
      v.literal("website"),
      v.literal("discord") // New type
    ),
    url: v.string(),
    name: v.string(),
    // Discord-specific config
    guildId: v.optional(v.string()),
    channels: v.optional(v.array(v.string())),
  })),
  refreshInterval: v.number(),
  discordEnabled: v.optional(v.boolean()), // Quick toggle
}))
```

## Data Models

### Discord Message Processing Flow

1. **Raw Discord Message** → **Processed Message** → **NewsItem**
2. **Reaction Ranking**: Sort by total reaction count (descending)
3. **Content Summarization**: Use existing Exa API for message summaries
4. **Deduplication**: Prevent duplicate messages across refreshes

### Message Ranking Algorithm

```typescript
function rankDiscordMessages(messages: DiscordMessage[]): DiscordMessage[] {
  return messages.sort((a, b) => {
    const aReactions = a.reactions.reduce((sum, r) => sum + r.count, 0);
    const bReactions = b.reactions.reduce((sum, r) => sum + r.count, 0);
    
    // Primary: reaction count (descending)
    if (aReactions !== bReactions) {
      return bReactions - aReactions;
    }
    
    // Secondary: timestamp (newest first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}
```

### Data Transformation

```typescript
function transformDiscordToNewsItem(message: DiscordMessage): NewsItem {
  return {
    title: `${message.author.username} in #${message.channelName}`,
    url: `https://discord.com/channels/${GUILD_ID}/${message.channelId}/${message.id}`,
    publishedDate: message.timestamp,
    author: message.author.username,
    summary: await summarizeWithExa(message.content),
    source: "Discord",
    metadata: {
      reactions: message.reactions,
      channelName: message.channelName,
      messageId: message.id,
    }
  };
}
```

## Error Handling

### Graceful Degradation Strategy

1. **Discord API Failures**: Continue serving other news sources
2. **Bot Permission Issues**: Log errors, show user-friendly messages
3. **Rate Limiting**: Implement exponential backoff with jitter
4. **Network Timeouts**: Fallback to cached data when available

### Error Recovery Patterns

```typescript
async function fetchDiscordWithFallback(): Promise<NewsItem[]> {
  try {
    return await fetchDiscordMessages();
  } catch (error) {
    console.error('Discord fetch failed:', error);
    
    // Try cached data
    const cached = await getCachedDiscordData();
    if (cached && !isExpired(cached)) {
      return cached.data;
    }
    
    // Return empty array to not break news feed
    return [];
  }
}
```

### User-Facing Error Messages

- **Bot Not Configured**: "Discord integration is not available. Please contact support."
- **Permission Denied**: "Unable to access Discord messages. Bot permissions may need updating."
- **Rate Limited**: "Discord data temporarily unavailable. Please try again in a few minutes."
- **Network Error**: "Connection to Discord failed. Showing cached content."

## Testing Strategy

### Unit Tests

1. **Discord Message Fetching** (`lib/__tests__/discord.test.ts`)
   - Mock Discord API responses
   - Test message ranking algorithm
   - Verify data transformation logic
   - Test error handling scenarios

2. **News Feed Integration** (`tests/convex/newsFeed.test.ts`)
   - Test Discord source integration
   - Verify caching behavior
   - Test user preference handling
   - Test fallback mechanisms

### Integration Tests

1. **End-to-End Discord Flow** (`playwright/discord-digest.spec.ts`)
   - Enable Discord in settings
   - Verify messages appear in news feed
   - Test dedicated Discord page
   - Test error states and recovery

2. **Settings Management** (`playwright/news-sources.spec.ts`)
   - Toggle Discord on/off
   - Configure channel preferences
   - Verify preference persistence
   - Test settings UI interactions

### Performance Tests

1. **Load Testing**: Verify Discord integration doesn't impact existing performance
2. **Cache Efficiency**: Test cache hit rates and expiration behavior
3. **Rate Limiting**: Verify proper handling of Discord API limits

### Test Data Setup

```typescript
// Mock Discord API responses for testing
const mockDiscordMessages: DiscordMessage[] = [
  {
    id: "123456789",
    content: "Check out this new AI development!",
    author: { id: "user1", username: "testuser" },
    timestamp: "2025-01-14T10:00:00Z",
    reactions: [{ emoji: "👍", count: 5 }, { emoji: "🔥", count: 3 }],
    channelId: "general",
    channelName: "general"
  }
];
```

## Security Considerations

### Bot Token Management
- Store `DISCORD_BOT_TOKEN` in Convex environment variables
- Never expose bot token in client-side code
- Implement token rotation procedures

### Permission Scoping
- Bot requires minimal permissions: `Read Message History`
- Restrict to specific channels if needed
- Regular permission audits

### Data Privacy
- Don't store Discord message content permanently
- Respect Discord's Terms of Service
- Handle user data according to privacy policy

### Rate Limiting Compliance
- Implement proper rate limiting to respect Discord API limits
- Use exponential backoff for retries
- Monitor API usage and implement alerts

## Performance Optimization

### Caching Strategy
- **L1 Cache**: Browser localStorage (30 minutes)
- **L2 Cache**: Convex `newsFeedCache` table (10 minutes)
- **Invalidation**: Manual refresh or preference changes

### Batch Processing
- Fetch messages in batches to reduce API calls
- Process reactions and ranking server-side
- Minimize client-side computation

### Lazy Loading
- Load Discord digest on-demand for dedicated page
- Progressive enhancement for main news feed
- Optimize bundle size with dynamic imports

## Deployment Considerations

### Environment Setup
```bash
# Required environment variables
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=1355280592962453585  # Already configured
```

### Bot Configuration
1. Create Discord application and bot
2. Generate bot token
3. Add bot to VAI VEX Discord server
4. Grant necessary permissions
5. Test bot connectivity

### Monitoring and Observability
- Log Discord API response times
- Monitor error rates and types
- Track user engagement with Discord content
- Alert on bot permission issues

### Rollback Strategy
- Feature flags for Discord integration
- Graceful degradation if issues arise
- Quick disable mechanism in settings
- Preserve existing news feed functionality