Membership CTA Implementation Plan
==================================

.. RESOLVED:
   - Active users will not see any payment reminder banners
   - Non-paid members will see a generic upgrade CTA
   - Inactive paid members will see personalized re-engagement messaging
   - Failed payment users will see urgent payment update CTAs

Task Checklist
-------------

**Phase 1: Update Subscription Info Query**
☐ Enhance ``getSubscriptionInfo`` to include user activity metrics
☐ Add fields for postCount, commentCount, lastActiveDate
☐ Calculate engagement level (active/inactive based on 30-day activity)
☐ Include member tenure (days since joining)
☐ Write tests for enhanced query

**Phase 2: Simplify Payment Reminder Banner**
☐ Update logic to hide banner completely for active paid members
☐ Show generic upgrade CTA for non-paid members
☐ Remove complex renewal reminder logic for non-paid users
☐ Write unit tests for simplified logic

**Phase 3: Generic Upgrade CTA Implementation**
☐ Create compelling upgrade message for non-paid members
☐ Design CTA that highlights VAI Pro benefits
☐ Add dismissal logic with longer persistence (7 days)
☐ Style with subtle, non-intrusive design
☐ Write tests for upgrade CTA behavior

**Phase 4: Future Personalization (Backlog)**
☐ Design personalized messages for inactive paid members
☐ Create re-engagement CTAs based on user history
☐ Implement A/B testing framework for message variants
☐ Track conversion metrics by user segment

Phase 1: Update Subscription Info Query
---------------------------------------

**Affected Files:**
- ``convex/stripe/getSubscriptionInfo.ts``
- ``convex/schema.ts`` (if new fields needed)

**Changes:**

Update ``convex/stripe/getSubscriptionInfo.ts``:
- Query user's posts count from last 30 days
- Query user's comments count from last 30 days
- Calculate ``lastActiveDate`` from most recent post or comment
- Add ``isActiveUser`` boolean (true if activity in last 30 days)
- Include ``memberSince`` date from user creation

Return additional fields:
- ``activityMetrics``: { postCount, commentCount, lastActiveDate, isActiveUser }
- ``memberTenureDays``: number of days since joining

**Unit Tests:**
- Test activity calculation logic
- Verify correct active/inactive classification
- Test edge cases (new users, no activity)
- Verify performance with activity queries

Phase 2: Simplify Payment Reminder Banner
-----------------------------------------

**Affected Files:**
- ``components/payment-reminder-banner.tsx``

**Changes:**

Update ``components/payment-reminder-banner.tsx``:
- Early return if user is active (``subscriptionInfo.activityMetrics?.isActiveUser``)
- Simplify logic to focus on two cases:
  1. Non-paid members: Show upgrade CTA
  2. Paid members with issues: Show payment/renewal reminders
- Remove complex renewal timing logic for non-paid users

Simplified conditions:
- If no subscription or not active subscription → Show upgrade CTA
- If active user with active subscription → Hide banner completely
- If inactive user with expiring subscription → Show renewal reminder
- If payment failed → Show payment update CTA

**Unit Tests:**
- Test banner visibility for active users (should be hidden)
- Test upgrade CTA for non-paid members
- Test payment failure messaging
- Verify dismissal behavior

Phase 3: Generic Upgrade CTA Implementation
------------------------------------------

**Affected Files:**
- ``components/payment-reminder-banner.tsx``
- ``components/ui/button.tsx`` (verify CTA styling)

**Changes:**

Non-paid member CTA content:
- Message: "Join VAI Pro to unlock exclusive AI engineering content and connect with industry leaders"
- CTA button: "Explore VAI Pro Benefits" → links to /pricing
- Dismissal: Store in localStorage for 7 days (not just session)
- Styling: Subtle gradient background, professional appearance

Update dismissal logic:
- Use localStorage with timestamp instead of sessionStorage
- Key: ``vai-upgrade-cta-dismissed``
- Value: ISO timestamp of dismissal
- Check if 7 days have passed before showing again

Visual design:
- Use subtle AI-themed gradient (blue to purple)
- Small icon (Sparkles or Zap from lucide-react)
- Compact height to avoid intrusiveness
- Smooth fade-in animation

**Unit Tests:**
- Test 7-day dismissal persistence
- Verify CTA link navigation
- Test responsive design
- Verify non-paid member detection

Phase 4: Future Personalization (Backlog)
----------------------------------------

**Future Enhancements:**

Inactive member re-engagement:
- "We've missed you! Check out what's new in the AI community"
- "Your AI engineering peers have shared 50+ new insights"
- Link to trending posts or recent discussions

Long-term member appreciation:
- "VAI member since [date] - Thank you for being part of our journey"
- Special loyalty pricing or perks

Smart timing:
- Don't show CTAs during active browsing sessions
- Wait for natural pause points
- Respect user's workflow

A/B testing framework:
- Track which messages drive conversions
- Test different value propositions
- Optimize CTA button text
- Measure engagement lift

**Success Metrics:**
- Conversion rate by user segment
- Time to conversion after CTA display
- Banner dismissal rates
- User satisfaction scores