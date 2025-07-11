Custom User Button Implementation Plan
====================================

.. RESOLVED:
   - Settings will open as a dialog with sidebar navigation
   - Settings sections: Notifications, Billing, and Account (all with "coming soon" badges)
   - Theme selection will use local storage (via next-themes)

Task Checklist
-------------

**Phase 1: Theme Toggle Component Refactoring**
☐ Create new ``ThemeToggleSwitch`` component using ``ToggleGroup``
☐ Style toggle group to look like a switch with light/dark/system options
☐ Test theme switching functionality
☐ Write unit tests for ``ThemeToggleSwitch``

**Phase 2: User Dropdown UI Enhancement**
☐ Update ``MemberDropdown`` to use custom avatar trigger
☐ Refactor dropdown content layout to match design aesthetic
☐ Integrate ``ThemeToggleSwitch`` into dropdown
☐ Remove theme toggle from footer
☐ Write unit tests for updated ``MemberDropdown``

**Phase 3: Settings Dialog Implementation**
☐ Create ``SettingsDialog`` component with sidebar navigation
☐ Implement sidebar with Notifications, Billing, and Account sections
☐ Add "coming soon" badges to all sections
☐ Integrate dialog trigger into ``MemberDropdown``
☐ Write unit tests for ``SettingsDialog``

**Phase 4: Navigation and Polish**
☐ Add proper focus management and keyboard navigation
☐ Test dropdown behavior across different screen sizes
☐ Write integration tests for user interaction flows

Phase 1: Theme Toggle Component Refactoring
------------------------------------------

**Affected Files:**
- ``components/theme-toggle-switch.tsx`` (new)
- ``components/ui/toggle-group.tsx`` (potentially modify styles)

**Changes:**

Create ``components/theme-toggle-switch.tsx``:
- Implement a switch-like theme toggle using ``ToggleGroup`` and ``ToggleGroupItem``
- Use ``useTheme()`` hook from ``next-themes``
- Design with three options: Light (sun icon), System (monitor icon), Dark (moon icon)
- Style to appear as a cohesive switch control with smooth transitions
- Ensure proper ARIA labels for accessibility

Styling approach:
- Use ``ToggleGroup`` with custom styling to create pill-shaped container
- Active state should have distinct background
- Icons should be small (14-16px) with proper spacing
- Smooth transitions between states

**Unit Tests:**
- Test theme switching between light/dark/system modes
- Verify correct active state rendering
- Test keyboard navigation (arrow keys)
- Verify ``useTheme`` hook integration

Phase 2: User Dropdown UI Enhancement
------------------------------------

**Affected Files:**
- ``components/member-dropdown.tsx``
- ``components/footer.tsx``
- ``components/ui/dropdown-menu.tsx`` (verify styling)

**Changes:**

Update ``components/member-dropdown.tsx``:
- Replace current button trigger with simple avatar implementation
- Remove chevron icon and text from trigger
- Use ``Avatar``, ``AvatarImage``, and ``AvatarFallback`` components
- Style avatar with hover state (subtle ring or opacity change)

Dropdown content structure:
- Header section: User avatar (larger), name, and email
- Remove membership tier badge from header
- Menu items in order:
  1. Profile (navigate to user profile)
  2. Settings (stub - show toast or navigate to placeholder)
  3. Divider
  4. Theme section with integrated ``ThemeToggleSwitch``
  5. Divider
  6. Log out (with muted styling)

Update ``components/footer.tsx``:
- Remove ``ThemeToggle`` import and usage
- Adjust layout to account for removed theme toggle

**Unit Tests:**
- Test dropdown open/close behavior
- Verify navigation callbacks (profile, settings, logout)
- Test avatar fallback rendering
- Verify theme toggle integration
- Test responsive behavior

Phase 3: Settings Dialog Implementation
--------------------------------------

**Affected Files:**
- ``components/settings-dialog.tsx`` (new)
- ``components/member-dropdown.tsx``
- ``components/ui/badge.tsx`` (verify "coming soon" styling)

**Changes:**

Create ``components/settings-dialog.tsx``:
- Implement dialog using ``Dialog``, ``DialogContent``, ``DialogTitle``, ``DialogDescription``
- Use ``SidebarProvider``, ``Sidebar``, ``SidebarContent`` for navigation
- Create sidebar menu with three items:
  1. Notifications (Bell icon)
  2. Billing (CreditCard icon)  
  3. Account (User icon)
- Each section displays "Coming soon" badge in content area
- Use breadcrumb navigation to show current section
- Style to match the provided inspiration code

Update ``components/member-dropdown.tsx``:
- Change Settings menu item to trigger ``SettingsDialog``
- Pass dialog open state management
- Remove navigation to ``/settings`` route

**Unit Tests:**
- Test dialog open/close behavior
- Verify sidebar navigation between sections
- Test responsive behavior (sidebar hidden on mobile)
- Verify "coming soon" badge rendering

Phase 4: Navigation and Polish
-----------------------------

**Affected Files:**
- ``components/member-dropdown.tsx``
- ``components/settings-dialog.tsx``
- ``components/theme-toggle-switch.tsx``

**Changes:**

Accessibility and UX:
- Add proper ``role`` and ARIA attributes to dropdown and dialog
- Implement escape key to close dropdown and dialog
- Ensure focus returns to trigger on close
- Add subtle animations for dropdown appearance
- Test and refine hover states for all interactive elements

Polish:
- Ensure consistent spacing and typography
- Verify dark mode appearance for all elements
- Add loading states if needed
- Optimize for mobile viewports
- Ensure smooth transitions between dialog sections

**Integration Tests:**
- Full user flow: click avatar → view dropdown → switch theme → see update
- Settings flow: click avatar → click settings → navigate sections → close dialog
- Logout flow: click avatar → click logout → verify sign out
- Keyboard navigation through all menu items and dialog
- Theme persistence across page reloads (local storage)