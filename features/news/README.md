# News Feature

A comprehensive news feed system that aggregates AI and technology content from multiple sources with intelligent caching and user-friendly interfaces.

## Overview

The news feature provides:
- **Multi-source aggregation** from AI/tech news sources
- **Dual-layer caching** for optimal performance
- **User-friendly interfaces** with loading states and refresh controls
- **Intelligent summarization** of article content
- **Rate limiting** to prevent abuse

## Architecture

### Components

- **NewsFeedWidget** - Compact sidebar widget showing top 5 stories
- **NewsPage** - Full-page view displaying up to 20 articles
- **NewsCard** - Individual article display component

### Data Flow

```
User Action → useNewsFeed Hook → localStorage Check (30min) →
├─ Cache Hit → Display Data
└─ Cache Miss → Convex Action → Server Cache Check (10min) →
   ├─ Server Cache Hit → Return + Update localStorage  
   └─ Server Cache Miss → Fetch from Exa API → Cache + Return
```

## Update Mechanics

### Trigger Points

1. **Component Mount**: When news feed components first load
2. **User Authentication**: When user ID changes (login/logout)
3. **Manual Refresh**: Via refresh buttons in UI
4. **Cache Expiration**: Automatic based on configured time limits

### Caching Strategy

**Two-Layer Caching System:**

| Layer | Duration | Storage | Purpose |
|-------|----------|---------|---------|
| Client | 30 minutes | localStorage | Fast initial loads |
| Server | 10 minutes | Convex DB | Reduce API calls |

**Cache Keys:**
- Client: `"vai_news_cache"`
- Server: `"user-${userId}"` or `"default"`

### Refresh Mechanisms

**Widget Refresh:**
- ⏱️ Rate limited to 30 seconds between refreshes
- 🎨 Visual feedback with spinning icon and blur effect
- 🚨 Toast notifications for rate limit violations

**Full Page Refresh:**
- 🚀 No rate limiting - immediate refresh capability
- 💫 Loading spinners during refresh operations
- 🔒 Button disabled during refresh to prevent duplicate requests

## API Integration

### Exa API Integration

The system fetches content from Exa API with:
- **General AI Query**: "latest AI developments machine learning artificial intelligence" (15 results)
- **Source-specific Queries**: Custom queries per configured source (5 results each)
- **Content Processing**: Automatic summarization and text extraction

### Default Sources (Phase 0)

```typescript
const DEFAULT_SOURCES = [
  {
    type: "blog",
    url: "https://github.com/microsoft/chat-copilot",
    name: "Microsoft Copilot",
  },
  {
    type: "blog", 
    url: "https://x.ai/news",
    name: "x.ai News",
  },
];
```

## Usage

### Basic Hook Usage

```typescript
import { useNewsFeed } from '@/features/news/hooks';

function MyComponent() {
  const { news, loading, refresh } = useNewsFeed();
  
  if (loading) return <LoadingSkeleton />;
  
  return (
    <div>
      <button onClick={refresh}>Refresh</button>
      {news.map(article => (
        <ArticleCard key={article.url} article={article} />
      ))}
    </div>
  );
}
```

### Widget Integration

```typescript
import { NewsFeedWidget } from '@/features/news/components';

function Sidebar() {
  return (
    <div>
      <NewsFeedWidget />
    </div>
  );
}
```

## Configuration

### Environment Variables

```bash
EXA_API_KEY=your_exa_api_key_here
```

### Cache Configuration

```typescript
// Client cache duration (30 minutes)
const CLIENT_CACHE_DURATION = 30 * 60 * 1000;

// Server cache duration (10 minutes)  
const SERVER_CACHE_DURATION = 10 * 60 * 1000;

// Rate limit duration (30 seconds)
const RATE_LIMIT_DURATION = 30 * 1000;
```

## Data Structure

### NewsItem Interface

```typescript
interface NewsItem {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source: string;
}
```

### NewsSource Interface

```typescript
interface NewsSource {
  type: "rss" | "youtube" | "podcast" | "blog" | "x" | "website";
  url: string;
  name: string;
}
```

## Performance Optimizations

- **Dual-layer caching** reduces API calls significantly
- **Rate limiting** prevents API abuse and improves UX
- **Loading skeletons** provide better perceived performance
- **Error boundaries** prevent component crashes
- **Content limiting** (5 items in widget, 20 in full page)
- **Optimistic updates** with immediate visual feedback

## Error Handling

- **API Failures**: Graceful degradation with cached content
- **Rate Limiting**: User-friendly error messages
- **Network Issues**: Retry logic with exponential backoff
- **Cache Corruption**: Automatic cache clearing and refresh

## Testing

### Unit Tests

```bash
npm test features/news/__tests__/hooks/use-news-feed.test.tsx
```

### Manual Testing

1. **Initial Load**: Verify news loads on component mount
2. **Cache Behavior**: Check 30-minute localStorage caching
3. **Refresh Functionality**: Test manual refresh with rate limiting
4. **Error States**: Simulate API failures and network issues

## Future Enhancements (Planned)

### Phase 1
- User-configurable news sources
- Discord daily digest integration
- Custom summarization prompts

### Phase 2  
- Shareable feed pages
- Profile feed pinning
- Advanced filtering options

## Troubleshooting

### Common Issues

**News not loading:**
- Check EXA_API_KEY environment variable
- Verify network connectivity
- Clear localStorage cache

**Rate limit errors:**
- Wait 30 seconds between refresh attempts
- Check for multiple rapid clicks

**Stale content:**
- Manual refresh bypasses all caches
- Check cache expiration times

### Debug Information

```typescript
// Access debug info in browser console
localStorage.getItem('vai_news_cache');

// Check server cache via Convex dashboard
// https://dashboard.convex.dev/d/your-deployment-id
```

## Related Files

- `convex/newsFeed.ts` - Server-side caching and API integration
- `convex/schema.ts` - Database schema for newsFeedCache table
- `lib/exa-client.ts` - Exa API client utilities
- `app/news/page.tsx` - Full news page implementation
- `components/post-sidebar.tsx` - Widget integration point