# Issue #80: Guard Members Page from Non-Members

## Summary
Implement access control for member-only pages that enforces both authentication and paid subscription requirements. This includes creating a dedicated sign-in route, updating middleware to protect member routes, and implementing server-side guards to verify payment status.

## Current State Analysis
- The `/members` routes are currently public
- Authentication is handled via Clerk modals (no dedicated sign-in page)
- Middleware only protects `/server` route
- Member pages use client-side authentication checks

## Implementation Plan

### Phase 0: Sign-in Page Route
**Files to create:**
- `app/sign-in/page.tsx` - New full-page sign-in experience

**Implementation details:**
- Use Clerk's `<SignIn />` component
- Extract `redirect_url` from search params
- Apply VAI design system styling
- Set `afterSignInUrl` to redirect param or default to `/members`

### Phase 1: Middleware Update
**Files to modify:**
- `middleware.ts` - Extend route protection

**Changes:**
- Update `createRouteMatcher` to include `/server(.*)` and `/members(.*)`
- Add `unauthorizedUrl` parameter to redirect unauthenticated users to sign-in page with return URL

### Phase 2: Server Wrappers for Paid-Member Guard
**Files to modify:**
- `app/members/page.tsx` - Convert to server component
- `app/members/[slug]/page.tsx` - Convert to server component

**Implementation:**
1. Rename existing files to `page-client.tsx`
2. Create new server component wrappers that:
   - Check authentication via `auth()` from Clerk
   - Query member status via Convex API
   - Redirect to sign-in if not authenticated
   - Redirect to pricing if not paid member
   - Render client component if authorized

### Phase 3: Automated Tests
**Files to create:**
- `playwright/member-access.spec.ts` - E2E tests

**Test scenarios:**
1. Guest visits `/members` → redirected to `/sign-in`
2. Free tier user visits `/members` → redirected to `/pricing`
3. Paid user visits `/members` → page loads successfully

## Technical Considerations
- Preserve slug paths in redirect URLs for dynamic routes
- Reuse existing Clerk appearance configuration
- Ensure server components properly handle Convex API calls
- Maintain consistent error handling and loading states

## Success Criteria
- Unauthenticated users cannot access protected routes
- Free tier users cannot access paid member content
- Redirect URLs are preserved through authentication flow
- All tests pass
- No regression in existing functionality