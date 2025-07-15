# Requirements Document

## Introduction

This feature implements Discord Daily Digest Integration as part of the enhanced news feed Phase 1, building on the completed Phase 0 infrastructure. The system will fetch Discord messages from the previous day, rank them by reaction count, and integrate them seamlessly into the existing news feed architecture. Users will be able to enable/disable this feature and view Discord content both in the main news feed and on a dedicated Discord digest page.

## Requirements

### Requirement 1

**User Story:** As a community member, I want to enable Discord daily digest in my news feed settings, so that I can see the most popular Discord messages from yesterday alongside other news sources.

#### Acceptance Criteria

1. WHEN a user navigates to news source settings THEN the system SHALL display a Discord digest toggle option
2. WHEN a user enables Discord digest THEN the system SHALL store this preference in the user's news feed sources configuration
3. WHEN a user disables Discord digest THEN the system SHALL remove Discord items from their news feed and update their preferences
4. WHEN Discord digest is enabled THEN the system SHALL include Discord messages in the main news feed display

### Requirement 2

**User Story:** As a community member, I want to see yesterday's most popular Discord messages ranked by reactions, so that I can catch up on important community discussions I might have missed.

#### Acceptance Criteria

1. WHEN the system fetches Discord messages THEN it SHALL retrieve messages from the previous day only
2. WHEN ranking Discord messages THEN the system SHALL sort them by reaction count in descending order
3. WHEN displaying Discord messages THEN the system SHALL show the most reacted messages first
4. WHEN no Discord messages have reactions THEN the system SHALL display them in chronological order
5. IF Discord API is unavailable THEN the system SHALL gracefully handle the error without breaking the news feed

### Requirement 3

**User Story:** As a community member, I want Discord messages to appear seamlessly integrated with other news sources, so that I have a unified news consumption experience.

#### Acceptance Criteria

1. WHEN Discord digest is enabled THEN Discord items SHALL appear in the main news feed alongside other sources
2. WHEN displaying Discord messages THEN they SHALL follow the same NewsItem interface as other sources
3. WHEN caching news feed data THEN Discord messages SHALL use the existing caching patterns
4. WHEN Discord integration fails THEN other news sources SHALL continue to work normally
5. WHEN Discord messages are summarized THEN they SHALL use the existing Exa summarization system

### Requirement 4

**User Story:** As a community member, I want access to a dedicated Discord digest page, so that I can view Discord-only content when I want to focus specifically on community discussions.

#### Acceptance Criteria

1. WHEN a user navigates to `/discord-digest` THEN the system SHALL display a dedicated Discord digest page
2. WHEN viewing the Discord digest page THEN it SHALL show top Discord messages with summaries
3. WHEN on the Discord digest page THEN users SHALL be able to manually refresh the content
4. WHEN Discord data is unavailable THEN the page SHALL display an appropriate error message
5. IF user has not enabled Discord digest THEN the page SHALL prompt them to enable it in settings

### Requirement 5

**User Story:** As a system administrator, I want the Discord bot properly configured with necessary permissions, so that the system can reliably fetch message data from the Discord guild.

#### Acceptance Criteria

1. WHEN the Discord bot is set up THEN it SHALL have message history access permissions in the target guild
2. WHEN the system starts THEN it SHALL successfully authenticate with the Discord API using the bot token
3. WHEN fetching messages THEN the system SHALL only access the configured guild (1355280592962453585)
4. IF bot permissions are insufficient THEN the system SHALL log appropriate error messages
5. WHEN bot token is invalid THEN the system SHALL handle authentication failures gracefully

### Requirement 6

**User Story:** As a developer, I want comprehensive error handling and testing coverage, so that the Discord integration is reliable and maintainable.

#### Acceptance Criteria

1. WHEN Discord API calls fail THEN the system SHALL continue operating without breaking other functionality
2. WHEN network issues occur THEN the system SHALL implement appropriate retry logic with exponential backoff
3. WHEN testing the system THEN unit tests SHALL cover Discord message fetching and ranking logic
4. WHEN running integration tests THEN they SHALL verify end-to-end Discord digest functionality
5. WHEN Discord service is down THEN users SHALL see informative error messages rather than broken interfaces