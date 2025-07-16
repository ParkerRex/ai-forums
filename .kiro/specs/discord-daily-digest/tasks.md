# Implementation Plan

- [x] 1. Set up Discord infrastructure and dependencies
  - Install discord.js SDK package and configure environment variables
  - Set up bot token configuration in Convex environment
  - Create basic Discord API connection utilities with error handling
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. Extend news source type system for Discord integration
  - Update SourceType union in features/news/utils/news-sources/types.ts to include "discord"
  - Create DiscordNewsSource interface extending NewsSource with guildId and channels properties
  - Update fetchers record in features/news/utils/news-sources/index.ts to include discord fetcher
  - _Requirements: 3.2, 3.3_

- [x] 3. Implement Discord message fetching and processing
  - ✅ Create features/news/utils/news-sources/discord.ts with fetchItems function (NEEDS REFACTOR: change from live API to database reads)
  - ✅ Implement Discord API client to fetch messages from previous day (PRESERVE: move to scheduled processing)
  - ✅ Add message ranking logic based on reaction count with chronological fallback (PRESERVE: move to archive processing)
  - ✅ Transform Discord messages to NewsItem interface format (PRESERVE: use in both archive processing and user queries)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Create Discord-specific Convex backend functions
  - Create convex/discord.ts with fetchDiscordMessages action
  - Implement getDiscordDigest action for Discord-only content retrieval
  - Add proper error handling and rate limiting for Discord API calls
  - Integrate with existing Exa summarization system for message content
  - _Requirements: 2.5, 3.4, 6.1, 6.2_

- [x] 5. Implement user preference management for Discord sources
  - Create convex/newsFeedSources.ts with Discord preference storage functions
  - Add updateDiscordPreferences mutation for enabling/disabling Discord digest
  - Add getDiscordPreferences query for retrieving user Discord settings
  - Extend member schema newsPreferences to include Discord configuration
  - _Requirements: 1.2, 1.3_

- [x] 6. Integrate Discord source into existing news feed system
  - Update convex/newsFeed.ts to include Discord source when user has it enabled
  - Modify news feed caching to handle Discord data with existing patterns
  - Ensure Discord integration preserves existing news feed functionality
  - Add fallback logic when Discord API is unavailable
  - _Requirements: 3.1, 3.4, 6.1_

- [x] 7. Create Discord-specific React hook for dedicated page
  - Create hooks/use-discord-digest.ts for Discord-only data fetching
  - Implement loading states, error handling, and manual refresh functionality
  - Add proper TypeScript types and error state management
  - Integrate with existing caching patterns for consistency
  - _Requirements: 4.2, 4.3_

- [ ] 8. Build Discord settings UI components
  - Create app/settings/news-sources/page.tsx for news source management
  - Create components/news/discord-settings.tsx for Discord-specific toggles
  - Add Discord enable/disable toggle with immediate preference updates
  - Implement channel selection interface if configurable channels are needed
  - _Requirements: 1.1, 1.2_

- [ ] 9. Implement dedicated Discord digest page
  - Create app/discord-digest/page.tsx for Discord-only content display
  - Display top Discord messages with summaries using existing UI patterns
  - Add manual refresh functionality and loading states
  - Show appropriate error messages when Discord is unavailable or disabled
  - _Requirements: 4.1, 4.4, 4.5_

- [ ] 10. Add comprehensive error handling and user feedback
  - Implement graceful degradation when Discord API fails
  - Add user-friendly error messages for different failure scenarios
  - Ensure other news sources continue working when Discord is down
  - Add retry logic with exponential backoff for Discord API calls
  - _Requirements: 6.1, 6.2, 6.5_

- [ ] 11. Create unit tests for Discord integration
  - Create lib/__tests__/discord.test.ts for Discord message fetching logic
  - Test message ranking algorithm with various reaction scenarios
  - Test data transformation from Discord messages to NewsItem format
  - Mock Discord API responses and test error handling paths
  - _Requirements: 6.3_

- [ ] 12. Create integration tests for end-to-end functionality
  - Create tests/convex/newsFeed.test.ts for Discord source integration
  - Test Discord preference storage and retrieval functions
  - Verify caching behavior with Discord data included
  - Test fallback mechanisms when Discord is unavailable
  - _Requirements: 6.3_

- [ ] 13. Implement Playwright tests for user interface flows
  - Create playwright/discord-digest.spec.ts for end-to-end Discord functionality
  - Test enabling Discord in settings and verifying feed integration
  - Test dedicated Discord digest page functionality and error states
  - Verify manual refresh and loading state behaviors
  - _Requirements: 6.4_

- [ ] 14. Add settings management integration tests
  - Create playwright/news-sources.spec.ts for settings UI testing
  - Test Discord toggle functionality and preference persistence
  - Verify settings changes immediately affect news feed content
  - Test error handling in settings UI when Discord is unavailable
  - _Requirements: 6.4_

- [ ] 15. Finalize integration and perform end-to-end testing
  - Verify Discord messages appear in main news feed when enabled
  - Test seamless integration with existing news sources and caching
  - Confirm all error scenarios display appropriate user messages
  - Validate performance impact and caching efficiency with Discord enabled
  - _Requirements: 3.1, 3.3, 6.1_