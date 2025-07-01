we need to make an incredibly helpful footer for the site, that acts more as a set of utilities you'd expect in an IDE. 

EG. It's only 24px tall. It has a slim 1px top border that is slighlty darker than the bg, and it has a few components within it. 


The bottom right shows the discord community with the number of active members online. 

Our guild id is: 1355280592962453585

I'm not sure if we need any permissions for use of that info but i doubt it. It's just a small pulsating green dot that is subtle. 

If a user hovers over it, it shows the number of active members online using a shadcn tool tip. 

The next small component is a last push tag. it shows the number of hours since the last git commit was made to vai. 

the next component is a countdown timer. it shows the number of minutes until 12pm ET on fridays. That is when we have our weekly call. 

These are all right justified. 

OPEN QUESTIONS
--------------
- **Resolved**: We will use the public Discord Guild *widget.json* endpoint directly via a small Next.js **/api/discord** proxy to avoid CORS; no extra libraries or bot token required.
- **Resolved**: Last-commit timestamp will come from a lightweight serverless **/api/last-commit** route that calls GitHub REST API (private-repo authenticated via ``GITHUB_TOKEN`` env). No build-time script needed.

Task Checklist
==============

Phase 1 – Footer skeleton
~~~~~~~~~~~~~~~~~~~~~~~~
☑ **footer.tsx** – create 24 px tall, sticky footer with 1 px top border and right-aligned flex container  
☑ **layout.tsx** – render new ``<Footer />`` at the bottom of every page  
☑ *Styling* – add any required CSS variables/classes in ``app/globals.css``
☑ **deps** – ``date-fns-tz``: ``npm i date-fns-tz``

Phase 2 – Discord presence indicator
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
☑ **app/api/discord/route.ts** – proxy to Discord *widget.json*; cache for 60 s  
☑ **lib/discord.ts** – typed fetcher using ``fetch`` + SWR  
☑ **components/discord-status.tsx** – green-dot badge + shadcn Tooltip showing ``n`` online  
☑ **footer.tsx** – import and display ``<DiscordStatus />``  
☑ **lib/__tests__/discord.test.tsx** – unit test mocked API response

Phase 3 – Git + countdown utilities
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
☐ **app/api/last-commit/route.ts** – fetch latest commit via GitHub API using ``GITHUB_TOKEN`` env; return commit timestamp  
☐ **lib/github.ts** – ``useLastCommit()`` SWR hook (60 s refresh; returns Date)  
☐ **components/last-push-tag.tsx** – shows "Updated X h ago" (updates every minute) using hook  
☐ **lib/time-utils.ts** – ``formatDurationAgo(ts)`` helper with tests  
☐ **components/weekly-countdown.tsx** – countdown to next Friday 12 PM ET; updates every 60 s  
☐ **lib/week-utils.ts** – ``minutesUntilNextFridayNoon(now)`` helper with edge-case tests  
☐ **footer.tsx** – add ``<LastPushTag />`` + ``<WeeklyCountdown />``
☐ **deps** – ensure ``date-fns`` + ``date-fns-tz`` typings available

Implementation Phases
=====================

Phase 1 – Footer skeleton
-------------------------
**Affected files**: ``components/footer.tsx``, ``app/layout.tsx``, ``app/globals.css``

1. Create ``components/footer.tsx``
   * Tailwind/shadcn flex row, ``h-[24px]``.
   * ``border-t`` using ``border-neutral-700`` (one shade darker than bg).
   * ``justify-end items-center gap-4 px-4``.
2. Import and render in ``app/layout.tsx`` just above ``</body>``.
3. Define CSS variable (if needed) for footer height in ``globals.css``.

Unit tests: none (visual component only).

Phase 2 – Discord presence indicator
------------------------------------
**Affected files**: ``app/api/discord/route.ts``, ``lib/discord.ts``, ``components/discord-status.tsx``, ``components/footer.tsx``, ``lib/__tests__/discord.test.ts``

1. API route: ``GET /api/discord`` proxies ``https://discord.com/api/guilds/1355280592962453585/widget.json``; responds with ``presence_count``; sets ``Cache-Control: s-maxage=60``.
2. ``lib/discord.ts`` provides ``useDiscordPresence()`` hook (SWR, 60 s refresh; returns count | null).
3. ``components/discord-status.tsx``
   * Shows small green dot (animate-ping) and tooltip "{count} online".
   * Hidden until first data load.
4. Mount in footer.
5. **Vitest** unit test: mock API response → hook returns expected count; confirm revalidation.
6. **Playwright** e2e: viewport check that footer renders Discord count badge once data is loaded.

Phase 3 – Git + countdown utilities
-----------------------------------
**Affected files**: ``app/api/last-commit/route.ts``, ``lib/github.ts``, ``components/last-push-tag.tsx``, ``components/weekly-countdown.tsx``, ``lib/time-utils.ts``, ``lib/week-utils.ts``, ``lib/__tests__/time-utils.test.ts``, ``lib/__tests__/week-utils.test.ts``, ``components/footer.tsx``

1. API route fetches ``https://api.github.com/repos/{owner}/{repo}/commits?per_page=1`` with ``Authorization: Bearer $GITHUB_TOKEN``; returns ``commit.author.date`` epoch; **cache 60 s**.
2. ``lib/github.ts`` offers ``useLastCommit()`` SWR hook (refresh 60 s) that returns timestamp.
3. ``last-push-tag.tsx``
   * Calculates ``formatDurationAgo(ts)``; updates via ``useInterval(60 s)``.
4. ``time-utils.ts`` unit tests: 5 min, 2 h, 1 d cases.
5. ``week-utils.ts`` returns minutes until upcoming Friday 12 PM ET using ``date-fns-tz`` for America/New_York conversion; tests.
6. ``weekly-countdown.tsx`` displays "⏱ XX min to Community Call"; refresh every 60 s.
7. Add both new components to footer with gap styling.

Unit tests: verify util outputs across week boundaries & DST.