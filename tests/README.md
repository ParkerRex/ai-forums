# Post Deletion Redirect Tests

This directory contains comprehensive tests for the post deletion redirect functionality that ensures users are redirected to the home page after deleting a post instead of being shown a 404 error page.

## Test Coverage

### 1. Playwright E2E Tests (`playwright/post-delete-redirect.spec.ts`)

End-to-end tests that verify the complete user flow:

- **Basic Redirect Flow**: Creates a post, deletes it, and verifies redirect to home page
- **Success Toast**: Ensures success notification appears after deletion
- **Direct URL Access**: Tests accessing a deleted post URL directly redirects to home
- **Navigation Context**: Verifies redirect works regardless of previous page navigation
- **Cancellation**: Ensures no redirect occurs when deletion is cancelled
- **Error Handling**: Tests graceful handling of deletion failures
- **Multi-Category Support**: Verifies behavior across different post categories
- **Browser History**: Ensures proper browser history handling after redirect

### 2. Unit Tests (`lib/__tests__/post-deletion-redirect.test.ts`)

Isolated unit tests for the redirect logic:

- **useEffect Behavior**: Tests conditional redirect logic based on post state
- **Router Navigation**: Verifies correct use of `router.push()` vs `router.replace()`
- **URL Validation**: Tests parameter validation logic
- **Component States**: Verifies proper rendering during different states
- **Edge Cases**: Tests rapid deletions, query parameters, etc.
- **Error Handling**: Ensures graceful handling of navigation errors

### 3. Backend Tests (`convex/test/post-deletion-redirect.test.ts`)

Convex backend tests ensuring proper data layer support:

- **Post Deletion**: Verifies posts are properly marked as deleted
- **Query Behavior**: Ensures `getPostBySlug` returns `null` for deleted posts
- **Authorization**: Tests that only post authors can delete their posts
- **Duplicate Deletion**: Handles attempts to delete already deleted posts
- **Non-existent Posts**: Proper error handling for invalid post IDs

## Key Implementation Details

### Frontend Logic
- Uses `useEffect` to detect when a post becomes `null` and triggers redirect
- Distinguishes between loading state (`undefined`) and deleted state (`null`)
- Uses `router.replace("/")` for automatic redirects (doesn't add to history)
- Uses `router.push("/")` for user-initiated redirects (adds to history)

### Backend Support
- Soft deletion: Posts are marked with `status: "deleted"` instead of being removed
- `getPostBySlug` filters out deleted posts, returning `null`
- Authorization checks ensure only post authors can delete their posts

### Error Boundaries
- Graceful handling of network failures during deletion
- Proper error messages and user feedback
- No redirect occurs if deletion fails

## Running the Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- playwright/post-delete-redirect.spec.ts
npm test -- lib/__tests__/post-deletion-redirect.test.ts
npm test -- convex/test/post-deletion-redirect.test.ts

# Run Playwright tests in headed mode
npx playwright test post-delete-redirect.spec.ts --headed
```

## Test Dependencies

- **Vitest**: Unit testing framework
- **Playwright**: E2E testing framework
- **Convex Test**: Backend testing utilities
- **React Testing Library**: Component testing utilities (via Vitest)

## Coverage Goals

These tests ensure:
1. ✅ Users never see 404 pages after deleting their own posts
2. ✅ Proper navigation flow and user experience
3. ✅ Data consistency in the backend
4. ✅ Security (authorization) enforcement
5. ✅ Error handling and edge cases
6. ✅ Cross-browser compatibility (via Playwright)

## Future Enhancements

Potential test additions:
- Performance testing for large-scale deletions
- Accessibility testing for screen readers
- Mobile-specific navigation testing
- Integration with analytics tracking 