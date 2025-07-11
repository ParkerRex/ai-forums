---

.. task checklist ------------------------------------------------------------------------------------------------------

☐ **Phase 0** – Core refactor & hard-coded multi-source feed
☐ **Phase 1** – User-configurable sources & Discord daily digest
☐ **Phase 2** – Shareable feed page & profile pinning

---

.. open questions ------------------------------------------------------------------------------------------------------

* **Discord API access** – Do we already store guild/channel/message data in Convex, or will the digest pull directly from Discord each request?
* **Summarization model** – Should we rely solely on Exa summaries or fall back to OpenAI/LLM when Exa provides only raw text?
* **Rate limits** – Any platform-level quotas we must respect (YouTube, X/Twitter) that require server-side caching?

---

Phase 0 – Core refactor & hard-coded multi-source feed
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Affected files
* ``components/news/news-feed-widget.tsx`` – rewrite as thin UI layer that consumes a new hook.
* ``hooks/use-news-feed.ts`` *(new)* – unified data loader, source registry, client caching.
* ``lib/news-sources/`` *(new dir)* – fetcher modules per *sourceType* (``rss.ts``, ``youtube.ts``, ``x-twitter.ts`` …).
* ``lib/exa-client.ts`` – minor: expose ``summarize(text)`` helper.
* ``convex/newsFeed.ts`` *(new)* – server action that orchestrates multi-source retrieval + Convex caching.
* `tests/hooks/use-news-feed.test.tsx`` *(new)* – unit tests for hook logic.

Concise changes
1. **Source schema** – create ``NewsSource`` TS interface:

   .. code:: ts

       export type SourceType = "rss" | "youtube" | "podcast" | "blog" | "x";
       export interface NewsSource {
         type: SourceType;
         url: string;
         name: string;
       }

2. **Static registry** – hard-code an array of ``NewsSource`` entries inside ``use-news-feed`` (initial set from widget’s current `defaultSources`).
3. **Fetcher modules** – each file in ``lib/news-sources/`` exports ``fetchItems(source: NewsSource): Promise<RawItem[]>`` returning unified raw shape ``{ title, url, publishedDate?, text? }``.
4. **Server action ``convex/newsFeed:get``** –
   * Accept ``userId?`` (optional for later phases) & list of sources.
   * For each source call corresponding fetcher; gather up to *MAX_ITEMS* per source.
   * Pass ``text`` or ``title`` to ``exaClient.summarize`` to produce the pithy one-liner.
   * Return sorted array (most recent first) of ``{ title, url, publishedDate, sourceName }``.
   * Cache per request in Convex key-value table for 10 min.
5. **Hook ``use-news-feed``** – calls Convex query, handles localStorage cache (reuse existing CACHE_KEY logic), exposes ``news``, ``loading``, ``refresh``.
6. **Widget** – replace embedded logic with hook usage; UI unchanged.
7. **Unit tests** – mock fetchers + Exa, assert merging, sorting, cache respect.

Phase 1 – User-configurable sources & Discord daily digest
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Affected files
* ``convex/newsFeedSources.ts`` *(new)* – table storing per-member ``NewsSource[]`` & prefs.
* ``convex/newsFeed.ts`` – update: read custom sources else fallback to defaults.
* ``app/settings/news-sources/page.tsx`` *(new)* – UI for managing sources + instructions.
* ``components/news/news-source-form.tsx`` *(new)* – reusable form.
* ``lib/news-sources/discord.ts`` *(new)* – fetch top reacted messages & summarize.
* ``hooks/use-discord-digest.ts`` *(new)* – client hook for dedicated page.
* ``app/discord-digest/page.tsx`` *(new)* – standalone digest page.
* ``tests/convex/newsFeed.test.ts`` *(new)* – unit test custom source merging.
* ``playwright/news-sources.spec.ts`` *(new)* – e2e create custom source, verify feed update.

Concise changes
1. **Schema** – create Convex table ``news_sources`` keyed by ``memberId`` storing list & preferences (max items, includeDiscord etc.).
2. **API** – add Convex mutation ``setNewsSources`` & query ``getNewsSources``.
3. **Settings UI** – allow add/edit/remove source (validate URL & type), textarea for *custom summarization prompt*.
4. **Feed resolver** – merge member’s custom list with platform defaults; pass per-source *prompt* to ``summarize``.
5. **Discord fetcher** – use Discord API (bot token env var) to fetch yesterday’s messages in target channels, rank by reaction count, output items.
6. **Dedicated page** – simple list rendered via ``use-discord-digest`` showing top N messages summary.
7. **Tests** – cover CRUD of sources & digest generation (mock Discord API).

Phase 2 – Shareable feed page & profile pinning
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Affected files
* ``app/feed/[memberId]/page.tsx`` *(new)* – public shareable feed.
* ``hooks/use-public-news-feed.ts`` *(new)* – wraps Convex *public* query.
* ``convex/newsFeed.ts`` – expose ``publicGet(memberId)`` limited to safe sources.
* ``components/profile/profile-header.tsx`` – add *Pin my feed* toggle.
* ``convex/members.ts`` – new boolean field ``showNewsFeed``.
* ``playwright/shareable-feed.spec.ts`` *(new)* – verify public access.

Concise changes
1. **Convex** – add public query returning sanitized news items (strip private sources).
2. **Profile header** – checkbox saves setting via mutation.
3. **Route ``/feed/[memberId]``** – server component fetches public feed & renders with same widget.
4. **SEO** – generate OG meta + structured data for discoverability.
5. **Tests** – e2e visibility toggling & unauthenticated access.
