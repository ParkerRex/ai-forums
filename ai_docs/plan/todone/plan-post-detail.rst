Post Detail Page Redesign Plan
==============================

**CRITICAL FIXES NEEDED IMMEDIATELY:**
- Button hover effects are too subtle and lack proper contrast
- Cursor states missing proper pointer indication on interactive elements
- Hover colors turning darker on dark backgrounds instead of providing contrast
- Action buttons have inconsistent sizing and touch targets
- Vote buttons need Reddit-style visual feedback
- Comment threading lines must work properly to show reply relationships

**CONFIRMED REQUIREMENTS:**
- Voting system will be upvote-only (no downvote functionality)
- ALL borders will be removed from post detail layout (main container, comment section, individual comments, action bars)
- Visual separation will be achieved through strategic whitespace instead of borders
- Comment threading will use Reddit-style connecting lines between avatars to show parent-child relationships

Task Checklist
==============

Phase 0 – Critical Button & Hover Fixes (IMMEDIATE)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
☐ **components/ui/button.tsx** – add proper cursor pointer and improve hover contrast
☐ **components/ui/vote-button.tsx** – fix hover effects and contrast issues
☐ **components/post-detail.tsx** – standardize button sizing and hover states
☐ **components/comment-section.tsx** – fix comment button hover and cursor states
☐ **components/ui/comment-thread-line.tsx** – ensure comment threading lines work properly
☐ **app/globals.css** – add better hover color variables for light/dark themes
☐ **Unit Tests** – update tests for improved button behavior and comment threading

Phase 1 – Voting System Redesign
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
☐ **components/ui/vote-button.tsx** – create new streamlined voting component matching screenshot design
☐ **components/post-detail.tsx** – replace current voting UI with new vote button component
☐ **components/comment-section.tsx** – update comment voting to use new vote button
☐ **convex/votes.ts** – remove downvote functionality, update to upvote-only system
☐ **components/vote-hover-card.tsx** – update to work with new voting component
☐ **components/ui/arrow-big-up.tsx** – deprecate or refactor for new design
☐ **Unit Tests** – update voting tests for upvote-only behavior

Phase 2 – Layout Restructuring & Comment Threading
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
☐ **components/post-detail.tsx** – remove ALL borders, implement minimal layout with whitespace separation
☐ **components/comment-section.tsx** – remove ALL card styling, implement Reddit-style comment threading
☐ **components/comment-item.tsx** – remove ALL borders, implement threading lines with CSS pseudo-elements
☐ **components/ui/comment-thread-line.tsx** – create threading line component for visual connections
☐ **app/[category]/[slug]/page-client.tsx** – update container styling for borderless layout
☐ **Unit Tests** – update layout tests for new structure and threading system

Phase 3 – Visual Polish & Testing
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
☐ **components/post-detail.tsx** – fine-tune spacing, typography, and responsive behavior
☐ **components/comment-section.tsx** – optimize comment threading visual hierarchy
☐ **playwright/post-detail.spec.ts** – add visual regression tests for new design
☐ **playwright/voting.spec.ts** – update voting interaction tests
☐ **Unit Tests** – comprehensive testing of redesigned components

Implementation Phases
======================

Phase 0 – Critical Button & Hover Fixes (IMMEDIATE)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Affected Files:**
- ``components/ui/button.tsx`` (base button component)
- ``components/ui/vote-button.tsx`` (vote button styling)
- ``components/post-detail.tsx`` (post action buttons)
- ``components/comment-section.tsx`` (comment action buttons)
- ``app/globals.css`` (theme variables)

**Critical Issues to Fix:**

1. **Button Cursor States:**
   - Add ``cursor-pointer`` to all interactive button variants
   - Ensure ``cursor-not-allowed`` for disabled states
   - Fix vote button cursor states during loading

2. **Hover Effect Contrast:**
   - Light mode: hover states should use darker colors for better visibility
   - Dark mode: hover states should use lighter colors instead of darker
   - Replace ``hover:bg-muted`` with more visible contrast ratios

3. **Vote Button Hover Issues:**
   - Current hover uses ``hover:shadow-md hover:-translate-y-0.5`` which is too subtle
   - Add background color changes for better feedback
   - Improve border hover states for non-voted buttons

4. **Action Button Standardization:**
   - Replace ``p-1`` with proper touch targets (min 44px)
   - Standardize button sizing across post and comment actions
   - Add consistent hover states for all action buttons

5. **Comment Threading Lines:**
   - Ensure vertical threading lines connect parent to child comments properly
   - Fix line positioning relative to comment avatars
   - Verify threading works correctly at all nesting levels
   - Test threading line visibility and alignment

**Specific Changes:**

Update ``components/ui/button.tsx``:
- Add ``cursor-pointer`` to base button styles
- Improve hover contrast: ``hover:bg-primary/10`` instead of ``hover:bg-muted``
- Add theme-aware hover colors for better visibility
- Update ghost variant with proper hover feedback

Update ``components/ui/vote-button.tsx``:
- Fix hover contrast: voted buttons should lighten on hover, not darken
- Add proper cursor states during voting process
- Improve border hover effects for non-voted state
- Add subtle background color changes on hover

Update ``components/post-detail.tsx``:
- Replace ``p-1`` with ``px-3 py-2`` for proper touch targets
- Standardize all action button hover states
- Add consistent cursor pointer for all interactive elements
- Fix button text color contrast on hover

Update ``components/comment-section.tsx``:
- Standardize comment action button sizing
- Fix hover states for comment voting and actions
- Ensure consistent cursor states across all comment interactions
- Add proper touch targets for mobile devices

Update ``app/globals.css``:
- Add better hover color variables: ``--hover-muted``, ``--hover-accent``
- Improve contrast ratios for both light and dark themes
- Add theme-aware hover colors that provide proper feedback

Update ``components/ui/comment-thread-line.tsx``:
- Verify vertical line positioning uses correct avatar center calculations
- Ensure horizontal connectors align properly with comment avatars
- Test threading line visibility at all nesting depths
- Fix any issues with line positioning relative to comment content height
- Verify threading lines don't interfere with comment interactions

**Testing Requirements:**
- Test button hover states in both light and dark themes
- Verify cursor states on all interactive elements
- Test touch targets on mobile devices (min 44px)
- Verify accessibility compliance for hover states
- Test comment threading lines at various nesting levels (1-5 deep)
- Verify threading line positioning with different comment heights
- Test threading line visibility and alignment on mobile devices

Phase 1 – Voting System Redesign
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Affected Files:**
- ``components/ui/vote-button.tsx`` (new)
- ``components/post-detail.tsx``
- ``components/comment-section.tsx``
- ``convex/votes.ts``
- ``components/vote-hover-card.tsx``

**Changes:**

Create new ``VoteButton`` component in ``components/ui/vote-button.tsx`` that matches the screenshot design:
- Pill-shaped button with upvote icon, vote count, and optional downvote icon
- White background with dark arrows in dark mode, dark background with light arrows in light mode
- When voted: inverted colors (dark background with light arrows in dark mode, light background with dark arrows in light mode)
- Compact design with ``px-3 py-1`` padding
- Single click toggles upvote state
- Integrates with existing optimistic updates system

Update ``components/post-detail.tsx`` voting section:
- Replace current voting UI (lines 467-515) with new ``VoteButton`` component
- Remove ``VoteHoverCard`` wrapper, integrate hover functionality into ``VoteButton``
- Maintain existing ``handleUpvote`` logic and optimistic updates
- Remove downvote-related code and state management

Update ``components/comment-section.tsx`` comment voting:
- Replace comment voting UI in ``CommentItem`` (lines 442-494) with ``VoteButton``
- Maintain existing comment voting logic and optimistic updates
- Remove downvote functionality from comment voting

Update ``convex/votes.ts`` to remove downvote support:
- Modify ``voteOnPost`` mutation to only accept "upvote" and "remove" vote types
- Update ``voteOnComment`` mutation similarly
- Remove downvote-related database operations and score calculations
- Update return types to reflect upvote-only system

Update ``components/vote-hover-card.tsx``:
- Integrate hover card functionality directly into ``VoteButton`` component
- Remove standalone ``VoteHoverCard`` component or refactor as internal utility
- Maintain voter list display functionality

**Unit Tests:**
- ``__tests__/components/vote-button.test.tsx`` – test new voting component behavior
- Update ``__tests__/components/post-detail.test.tsx`` – verify voting integration
- Update ``__tests__/convex/votes.test.ts`` – test upvote-only mutations

Phase 2 – Layout Restructuring & Comment Threading
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Affected Files:**
- ``components/post-detail.tsx``
- ``components/comment-section.tsx``
- ``components/ui/comment-thread-line.tsx`` (new)
- ``app/[category]/[slug]/page-client.tsx``

**Changes:**

Update ``components/post-detail.tsx`` layout structure:
- Remove ALL borders: main card wrapper (``bg-card border border-border rounded-lg`` on line 294)
- Remove header border separator (``border-b border-border`` on line 296)
- Remove actions bar border (``border-t border-border pt-4 mt-6`` on line 466)
- Replace borders with strategic whitespace: ``space-y-6``, ``py-6``, ``mb-8``
- Implement clean layout with generous padding and margins for visual separation
- Maintain responsive design and accessibility
- Keep back button and navigation elements with minimal styling

Create ``components/ui/comment-thread-line.tsx`` for Reddit-style threading:
- Implement CSS-based threading lines using ``::before`` and ``::after`` pseudo-elements
- Create vertical lines that connect parent avatars to child comment avatars
- Design branching structure: vertical line from parent + horizontal connector to child
- Use ``border-l-2 border-muted`` for vertical lines, ``border-b-2 border-muted`` for horizontal connectors
- Position lines using ``absolute`` positioning relative to comment container
- Calculate line heights dynamically based on comment content height
- Hide first-level threading line, show for nested comments (depth > 0)

Update ``components/comment-section.tsx`` layout:
- Remove ALL borders: comment section card wrapper (``bg-card border border-border rounded-lg p-6`` on line 839)
- Remove individual comment borders (``border border-border rounded-lg p-4`` on line 237)
- Implement Reddit-style comment threading with connecting lines
- Replace card-based nesting with position-relative containers for line positioning
- Use ``ml-8`` progressive indentation: depth 0 = ``ml-0``, depth 1 = ``ml-8``, depth 2 = ``ml-16``
- Integrate ``CommentThreadLine`` component for visual connections
- Maintain drag-and-drop functionality with updated visual feedback

Technical Implementation for Comment Threading Lines:
- **Structure**: Each comment container has ``position: relative`` for line positioning
- **Vertical Lines**: Use ``::before`` pseudo-element with ``border-l-2``, positioned ``left: -20px``
- **Horizontal Connectors**: Use ``::after`` pseudo-element with ``border-b-2``, positioned to connect vertical line to avatar
- **Line Calculations**:
  - Vertical line height = distance from parent avatar center to current avatar center
  - Horizontal line width = 20px (distance from vertical line to avatar)
  - Avatar center offset = 24px (half of 48px avatar height) + padding
- **Responsive Behavior**:
  - Mobile (< 640px): Reduce indentation to ``ml-4``, ``ml-8``, ``ml-12``
  - Adjust line positioning for smaller avatar sizes on mobile
- **Accessibility**: Lines are decorative, use ``aria-hidden="true"`` and don't interfere with screen readers

Update ``app/[category]/[slug]/page-client.tsx``:
- Remove container borders and background styling
- Adjust container spacing: ``space-y-6`` to ``space-y-8`` for generous whitespace separation
- Ensure proper responsive behavior across device sizes
- Add ``max-w-4xl mx-auto`` for optimal reading width

**Unit Tests:**
- Update ``__tests__/components/post-detail.test.tsx`` – verify borderless layout structure
- Update ``__tests__/components/comment-section.test.tsx`` – test threading line positioning
- ``__tests__/components/comment-thread-line.test.tsx`` – test line calculation logic
- ``__tests__/layout/responsive.test.tsx`` – test responsive threading behavior
- ``__tests__/accessibility/comment-threading.test.tsx`` – verify threading doesn't impact screen readers

Phase 3 – Visual Polish & Testing
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Affected Files:**
- ``components/post-detail.tsx``
- ``components/comment-section.tsx``
- ``playwright/post-detail.spec.ts``
- ``playwright/voting.spec.ts``

**Changes:**

Fine-tune ``components/post-detail.tsx`` visual details:
- Remove ALL remaining borders and implement whitespace-based separation
- Optimize typography hierarchy with consistent ``text-sm``, ``text-base``, ``text-lg`` sizing
- Implement generous spacing using ``space-y-6``, ``space-y-8``, ``py-8`` for visual separation
- Ensure proper contrast ratios and accessibility compliance
- Add subtle hover states for interactive elements without borders
- Optimize mobile responsive behavior with ``sm:``, ``md:``, ``lg:`` breakpoints

Optimize ``components/comment-section.tsx`` visual hierarchy:
- Perfect Reddit-style comment threading line positioning and calculations
- Implement progressive indentation for nested comments (``ml-8``, ``ml-16``, ``ml-24``)
- Fine-tune threading line colors: ``border-muted`` in light mode, ``border-muted-foreground/20`` in dark mode
- Optimize comment metadata display with consistent ``text-xs text-muted-foreground``
- Ensure proper spacing between comment elements without borders
- Test threading line behavior with deeply nested comments (5+ levels)
- Verify line positioning accuracy across different comment content heights

Create comprehensive test coverage:
- ``playwright/post-detail.spec.ts`` – visual regression tests for new layout
- ``playwright/voting.spec.ts`` – interaction tests for new voting system
- Test responsive behavior across mobile, tablet, desktop viewports
- Verify accessibility compliance with screen readers and keyboard navigation

**Unit Tests:**
- ``__tests__/visual/post-detail.test.tsx`` – snapshot tests for borderless layout consistency
- ``__tests__/accessibility/post-detail.test.tsx`` – accessibility compliance tests
- ``__tests__/responsive/post-detail.test.tsx`` – responsive behavior verification
- ``__tests__/visual/comment-threading.test.tsx`` – visual regression tests for threading lines

Reddit-Style Comment Threading Technical Specification
======================================================

**Visual Analysis from Reference Screenshots:**

The Reddit comment threading system uses connecting lines to show parent-child relationships:

1. **Vertical Lines**: Connect from parent comment avatar down to child comment level
2. **Horizontal Connectors**: Branch from vertical line to child comment avatar
3. **Progressive Indentation**: Each nesting level indents further right (8px, 16px, 24px, etc.)
4. **Line Positioning**: Lines are positioned relative to avatar centers, not comment containers
5. **Visual Hierarchy**: Lines use subtle colors that don't compete with content

**CSS Implementation Strategy:**

.. code-block:: css

   /* Comment container with relative positioning for line anchoring */
   .comment-container {
     position: relative;
     margin-left: calc(var(--depth) * 32px); /* 32px per nesting level */
     padding: 16px 0;
   }

   /* Vertical threading line */
   .comment-container::before {
     content: '';
     position: absolute;
     left: -20px;
     top: 0;
     bottom: 50%;
     width: 2px;
     background: var(--border-muted);
     display: var(--show-vertical-line); /* hidden for depth 0 */
   }

   /* Horizontal connector to avatar */
   .comment-container::after {
     content: '';
     position: absolute;
     left: -20px;
     top: 24px; /* avatar center offset */
     width: 16px;
     height: 2px;
     background: var(--border-muted);
     display: var(--show-horizontal-line); /* hidden for depth 0 */
   }

**Component Structure:**

.. code-block:: typescript

   interface CommentThreadLineProps {
     depth: number;
     isLastChild: boolean;
     parentAvatarOffset: number;
     currentAvatarOffset: number;
   }

   const CommentThreadLine: React.FC<CommentThreadLineProps> = ({
     depth,
     isLastChild,
     parentAvatarOffset,
     currentAvatarOffset
   }) => {
     if (depth === 0) return null;

     const verticalLineHeight = currentAvatarOffset - parentAvatarOffset;
     const horizontalLineWidth = 16;

     return (
       <div className="absolute pointer-events-none" aria-hidden="true">
         {/* Vertical line from parent */}
         <div
           className="absolute border-l-2 border-muted"
           style={{
             left: '-20px',
             top: `-${parentAvatarOffset}px`,
             height: `${verticalLineHeight}px`
           }}
         />
         {/* Horizontal connector to current avatar */}
         <div
           className="absolute border-b-2 border-muted"
           style={{
             left: '-20px',
             top: '24px', // avatar center
             width: `${horizontalLineWidth}px`
           }}
         />
       </div>
     );
   };

**Responsive Behavior:**

- **Desktop (≥1024px)**: Full 32px indentation, 2px line thickness
- **Tablet (768px-1023px)**: Reduced 24px indentation, 2px line thickness
- **Mobile (<768px)**: Minimal 16px indentation, 1px line thickness
- **Avatar scaling**: Lines adjust to smaller avatar sizes on mobile (32px vs 48px)

**Accessibility Considerations:**

- Threading lines use ``aria-hidden="true"`` as they are purely decorative
- Lines don't interfere with keyboard navigation or screen reader flow
- Comment hierarchy is maintained through proper HTML nesting and ARIA labels
- Focus indicators remain visible and unobstructed by threading lines
