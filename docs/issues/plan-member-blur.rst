Member Information Blur Implementation Plan
==========================================

.. OPEN QUESTIONS:
.. - Should we blur member information on their own profile page when they view it?
.. - Should scholarship members see all member info without blur?
.. - Should we show a preview (e.g., first few words of bio) before blur?
.. - Should admin users bypass all blur restrictions?

Phase 1: Core Infrastructure
----------------------------

**Affected Files:**
- ``components/blur-wrapper.tsx`` (new)
- ``hooks/use-member-access.ts`` (new)
- ``convex/members.ts`` (modify)

**Summary:**
Create reusable infrastructure for blurring member information based on viewer's subscription status.

**1. Create Blur Wrapper Component** (``components/blur-wrapper.tsx``):
   - Accept ``isBlurred`` boolean prop
   - Apply CSS blur filter and pointer-events when blurred
   - Support optional preview text before blur
   - Include upgrade CTA overlay when blurred
   - Use similar styling to existing ``Paywall`` component

**2. Create Member Access Hook** (``hooks/use-member-access.ts``):
   - Check current user's authentication status
   - Fetch subscription info using ``api.stripe.getSubscriptionInfo``
   - Return ``canViewMemberDetails`` boolean
   - Cache result to avoid repeated API calls

**3. Add Backend Support** (``convex/members.ts``):
   - Create ``getViewerAccess`` query that returns:
     - Viewer's authentication status
     - Viewer's subscription status
     - Whether viewer can access full member info
   - Reuse existing ``canViewFullContent`` helper from ``convex/helpers/subscription-access.ts``

**Unit Tests:**
- Test blur wrapper with different blur states
- Test access hook with various subscription states
- Test backend query with authenticated/unauthenticated users

Phase 2: Member Display Components
----------------------------------

**Affected Files:**
- ``components/member-card.tsx`` (modify)
- ``components/members-display.tsx`` (modify)
- ``app/members/page.tsx`` (modify)

**Summary:**
Integrate blur functionality into member listing components.

**1. Update Members Page** (``app/members/page.tsx``):
   - Use ``useMemberAccess`` hook to get viewer access
   - Pass ``viewerCanAccess`` prop to ``MembersDisplay`` component

**2. Update Members Display** (``components/members-display.tsx``):
   - Accept ``viewerCanAccess`` prop
   - Pass to individual ``MemberCard`` components
   - Apply to both grid and table views

**3. Update Member Card** (``components/member-card.tsx``):
   - Wrap sensitive information in ``BlurWrapper``:
     - Social media links section
     - Bio text (show first 50 chars as preview)
     - Specific location (keep country visible)
     - Activity stats
     - Last active timestamp
   - Keep visible: name, avatar, country, tier badge, join date

**Unit Tests:**
- Test member card renders correctly with/without access
- Test grid and table views respect access control
- Test preview text displays correctly

Phase 3: Member Profile & Interactions
--------------------------------------

**Affected Files:**
- ``app/members/[slug]/page.tsx`` (modify)
- ``components/member-profile.tsx`` (modify)
- ``components/member-hover-card.tsx`` (modify)

**Summary:**
Apply blur to individual member profiles and interactive components.

**1. Update Member Profile Page** (``app/members/[slug]/page.tsx``):
   - Use ``useMemberAccess`` hook
   - Pass access status to profile component
   - Consider special case: viewing own profile should bypass blur

**2. Update Member Profile Component** (``components/member-profile.tsx``):
   - Blur social links section
   - Blur detailed bio (show preview)
   - Blur skills array
   - Keep posts and activity visible (drives engagement)

**3. Update Hover Card** (``components/member-hover-card.tsx``):
   - Disable Discord chat button for non-paying viewers
   - Show "Upgrade to connect" message
   - Keep basic info visible

**Unit Tests:**
- Test profile page with various access scenarios
- Test own profile bypasses blur
- Test hover card respects access control