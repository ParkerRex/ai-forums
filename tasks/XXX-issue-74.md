# Task Plan: Issue #74 - Admin Post Pinning Feature

## Overview
Implement admin-only post pinning with category-specific and global pin support. Allow up to 3 pinned posts per category and 3 globally pinned posts.

## Implementation Steps

### 1. Database Schema Updates
- [ ] Extend posts table schema with pin metadata fields:
  - `pinScope`: union type for "category" | "global" | "both"
  - `pinnedAt`: timestamp when pinned
  - `pinnedBy`: ID of admin who pinned
- [ ] Add database indexes for efficient pinned post queries

### 2. Backend Implementation (Convex)
- [ ] Create `pinPost` mutation with admin authorization
  - Validate admin role
  - Check pinning limits (3 per category, 3 global)
  - Support different pin scopes
- [ ] Create `unpinPost` mutation with admin authorization
- [ ] Update existing post queries:
  - `getPostsByCategory`: Show category pinned posts first
  - `getAllPosts`: Show globally pinned posts first
  - Maintain existing sort order for non-pinned posts

### 3. Frontend Components
- [ ] Create `PinPostButton` component
  - Dropdown menu for pin scope selection
  - Show unpin button for already pinned posts
  - Admin-only visibility
- [ ] Update `PostCard` component
  - Add pin icon and "Pinned" label
  - Apply visual styling (orange theme)
  - Show pin scope information
- [ ] Integrate pin controls into existing post action menus

### 4. Testing & Validation
- [ ] Test pin/unpin functionality as admin
- [ ] Verify pinning limits are enforced
- [ ] Ensure non-admins cannot access pin features
- [ ] Test sorting behavior in feeds
- [ ] Verify visual indicators display correctly

## Technical Details

### Database Changes
- Leverage existing `isPinned` field
- Add new fields for enhanced pin management
- Create efficient indexes for query performance

### API Design
- Mutations require admin authentication
- Clear error messages for limit violations
- Atomic operations for data consistency

### UI/UX Considerations
- Orange color theme for pin indicators (#FFA500)
- Subtle background tint for pinned posts
- Clear scope labels (Category/Global/Both)
- Responsive design for mobile

## Success Criteria
- Admins can pin/unpin posts with proper limits
- Pinned posts appear at top of feeds
- Clear visual distinction for pinned content
- No performance degradation
- Secure admin-only access