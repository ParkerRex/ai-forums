☐ **Enhanced Text Editor with Slash Commands**

  *Summary*: Upgrade the post-creation form to provide a rich text editing experience with slash command functionality for better UX when creating text posts or posts with mixed content (text + video).

  **Current State**: Basic TipTap implementation with limited functionality

  **Target State**: Full-featured editor with slash command menu supporting:

  - Paragraph
  - Heading 1, 2, 3
  - Bullet list
  - Numbered list
  - Quote/Blockquote
  - Code block
  - Link insertion
  - Divider/HR
  - Checklist (optional)

  **Implementation Notes**:

  - Slash commands triggered by typing `/` to open contextual menu
  - Enhanced writing experience for text posts and mixed content posts
  - Leverages existing UI component patterns (Command, Popover, etc.)
  - Maintains backward compatibility with current content storage
  - Follows project's design system and accessibility standards

☐ **Task Breakdown**

  #. ☐ Update database schema to support dual content storage (JSON + HTML)
  #. ☐ Implement TipTap slash command extension and command registry
  #. ☐ Create slash command menu UI components with proper styling
  #. ☐ Integrate enhanced editor into post-creation form
  #. ☐ Add content migration for existing posts
  #. ☐ Test with text-only posts and mixed content posts
  #. ☐ Implement comprehensive test coverage (unit, integration, E2E)


# Slash Commands Feature Specification

## Overview

A slash command system for rich text editors that allows users to quickly insert and format content by typing "/" followed by a command name. This system provides an intuitive way to access formatting options, insert media, and structure content without using traditional toolbar buttons.

## Core Features

### 1. Command Triggering
- **Trigger Character**: "/" (forward slash)
- **Activation**: When user types "/" in the editor, a dropdown menu appears
- **Context Aware**: Commands are contextual to the current cursor position
- **Real-time Filtering**: As user continues typing after "/", commands are filtered by search terms

### 2. Command Categories

#### Text Formatting
- **Paragraph** - Convert to normal paragraph text
- **Heading 1** - Large heading (h1)
- **Heading 2** - Medium heading (h2)
- **Heading 3** - Small heading (h3)
- **Quote/Blockquote** - Indented quote block with left border
- **Code Block** - Syntax-highlighted code block with language support

#### Lists
- **Bullet List** - Unordered list with bullet points
- **Numbered List** - Ordered list with numbers
- **Checklist** - Interactive checkbox list items (task list)

#### Content & Media
- **Link** - Insert/edit hyperlink with automatic preview generation
- **Divider** - Horizontal rule/separator line
- **Mention** - Insert @mention for team members (leverages existing mention system)

#### Advanced (Future Phases)
- **Table** - Insert data table (Phase 4+)
- **Callout** - Highlighted information box (Phase 4+)
- **Image Upload** - Direct image insertion via file upload (Phase 4+)

### 3. User Interface

#### Desktop Menu (Dropdown)
- **Positioning**: Appears below the "/" character using Tippy.js positioning
- **Styling**: Follows project's popover design system with ``bg-popover`` and ``border``
- **Max Height**: 330px with scrollable overflow (``overflow-y-auto``)
- **Width**: 280px fixed width for consistency
- **Animation**: Smooth fade-in/out with scale transform (150ms duration)

#### Mobile Menu (Drawer)
- **Component**: Uses shadcn Drawer component (``@/components/ui/drawer``)
- **Trigger**: Same "/" character detection
- **Positioning**: Slides up from bottom of screen
- **Touch Targets**: Larger tap areas (48px minimum) for better mobile interaction
- **Scrolling**: Native mobile scrolling behavior

#### Command Items
- **Icon**: 20px Lucide React icons with consistent stroke-width
- **Title**: Clear, descriptive name using project typography
- **Description**: Optional brief explanation in ``text-muted-foreground``
- **Layout**: Flex layout with 12px gap between icon and text
- **Keyboard Navigation**: Arrow keys to navigate, Enter/Tab to select, Escape to close
- **Order**: Fixed order: Paragraph, Heading 1, Heading 2, Bullet List, Numbered List, Quote, Divider, Code Block, Link, Media

#### Visual States
- **Default**: Transparent background with ``text-foreground``
- **Hover**: ``bg-accent`` background with ``text-accent-foreground``
- **Selected**: ``bg-accent`` background for keyboard navigation
- **Focus**: Proper focus ring using ``focus-visible:ring-ring`` pattern
- **Mobile Touch**: Larger touch targets with haptic feedback (where supported)

## Technical Architecture

### 1. Core Components

#### Command Definition
```typescript
interface SlashCommand {
  id: string;
  title: string;
  description?: string;
  searchTerms: string[];
  icon: React.ReactNode;
  category: 'formatting' | 'lists' | 'content' | 'advanced';
  execute: (editor: Editor, range: Range) => void;
  isAvailable?: (editor: Editor) => boolean;
  shortcut?: string; // Optional keyboard shortcut display
}
```

#### Command Registry
- Central registry in ``components/rich-text/slash-commands/constants.ts``
- Exports typed array of ``SlashCommand`` objects following existing editor constants pattern
- Flat list structure (no categories) with fixed order
- Commands: Paragraph, Heading 1, Heading 2, Bullet List, Numbered List, Quote, Divider, Code Block, Link, Media
- Static registry sufficient for TipTap-based extensibility

#### Suggestion Engine
- Built on TipTap's ``@tiptap/suggestion`` extension
- Text matching against command titles and search terms
- Case-insensitive filtering with real-time updates
- Ranking by relevance (exact match > starts with > contains)
- Configurable search sensitivity and debouncing

### 2. Editor Integration

#### TipTap Extensions
- **Suggestion Extension**: Core ``@tiptap/suggestion`` for "/" detection
- **Custom Slash Command Extension**: Wrapper in ``extensions/slash-command.ts``
- **Command Execution**: Integration with TipTap's command chain API
- **Existing Extensions**: Maintains compatibility with LinkBadge, Mention, Markdown

#### State Management
```typescript
interface SlashCommandState {
  editor: Editor | null;
  activeRange: Range | null;
  isOpen: boolean;
  selectedIndex: number;
  searchQuery: string;
  filteredCommands: SlashCommand[];
}
```

### 3. Data Storage

#### Content Format
- **Structured Data**: Store editor content as JSON (TipTap format)
- **Rendered HTML**: Pre-rendered HTML for fast display and SEO
- **Dual Storage**: Both formats stored in database for optimal performance
- **Backward Compatibility**: Legacy ``content`` field maintained during transition

#### Database Schema Updates
```typescript
// convex/schema.ts additions
posts: defineTable({
  // ... existing fields
  content: v.optional(v.string()),        // Legacy field (deprecated)
  contentJson: v.optional(v.any()),       // TipTap JSON structure
  contentHtml: v.optional(v.string()),    // Pre-rendered HTML
  // ... rest of fields
})

post_versions: defineTable({
  // ... existing fields
  content: v.string(),                    // Legacy content
  contentJson: v.optional(v.any()),       // TipTap JSON snapshot
  contentHtml: v.optional(v.string()),    // Pre-rendered HTML snapshot
  // ... rest of fields
})
```

## Implementation Details

### 1. Command Execution Flow

1. **Detection**: User types "/" character
2. **Activation**: Suggestion system activates, shows dropdown
3. **Filtering**: User continues typing, commands filtered in real-time
4. **Selection**: User selects command via click or keyboard
5. **Execution**: Command function runs, modifying editor content
6. **Cleanup**: Dropdown closes, "/" text is removed

### 2. Command Implementation Examples

#### Heading Command
```typescript
{
  id: 'heading-1',
  title: 'Heading 1',
  description: 'Large section heading',
  searchTerms: ['h1', 'heading', 'title', 'large', 'header'],
  icon: <Heading1 className="w-5 h-5" />,
  category: 'formatting',
  execute: (editor, range) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .setNode('heading', { level: 1 })
      .run();
  }
}
```

#### List Command
```typescript
{
  id: 'bullet-list',
  title: 'Bullet List',
  description: 'Create an unordered list',
  searchTerms: ['ul', 'bullets', 'unordered', 'list'],
  icon: <List className="w-5 h-5" />,
  category: 'lists',
  execute: (editor, range) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .toggleBulletList()
      .run();
  }
}
```

### 3. Keyboard Navigation

#### Supported Keys
- **Arrow Up/Down**: Navigate through command list
- **Enter**: Execute selected command
- **Escape**: Close command menu
- **Tab**: Execute selected command (alternative to Enter)

#### Implementation
```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
      setSelectedIndex(prev => Math.min(prev + 1, commands.length - 1));
      break;
    case 'ArrowUp':
      setSelectedIndex(prev => Math.max(prev - 1, 0));
      break;
    case 'Enter':
    case 'Tab':
      executeCommand(commands[selectedIndex]);
      break;
    case 'Escape':
      closeCommandMenu();
      break;
  }
};
```

## Visual Design & Styling

### 1. Component Architecture
- **Base Component**: ``SlashCommandMenu.tsx`` using project's design tokens
- **Item Component**: ``CommandItem.tsx`` with consistent hover/focus states
- **Icon System**: Lucide React icons with standardized sizing
- **Theme Integration**: Full support for light/dark mode via CSS variables

### 2. Dropdown Container Styling
```css
.slash-command-dropdown {
  /* Uses project's popover styling */
  background: hsl(var(--popover));
  border: 1px solid hsl(var(--border));
  border-radius: calc(var(--radius) - 2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

  /* Dimensions */
  width: 280px;
  max-height: 330px;

  /* Positioning via Tippy.js */
  z-index: 50;

  /* Scrolling */
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
}
```

### 3. Command Item Styling
```css
.slash-command-item {
  /* Layout */
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;

  /* Typography */
  font-size: 14px;
  color: hsl(var(--foreground));

  /* Interactive states */
  cursor: pointer;
  border-radius: calc(var(--radius) - 4px);
  transition: all 150ms ease-in-out;
}

.slash-command-item:hover,
.slash-command-item[data-selected="true"] {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}
```

### 4. Icon Specifications

#### Icon Library
**Lucide React** - Consistent with existing project icons
```bash
# Already installed in project
import {
  Text, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare,
  Quote, Code, Link, Minus
} from 'lucide-react'
```

#### Icon Mapping
```typescript
const COMMAND_ICONS = {
  paragraph: Text,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  bulletList: List,
  orderedList: ListOrdered,
  taskList: CheckSquare,
  blockquote: Quote,
  codeBlock: Code,
  link: Link,
  divider: Minus,
} as const;
```

#### Icon Styling
```css
.slash-command-icon {
  width: 20px;
  height: 20px;
  color: hsl(var(--muted-foreground));
  stroke-width: 1.5;
  flex-shrink: 0;
}

.slash-command-item:hover .slash-command-icon,
.slash-command-item[data-selected="true"] .slash-command-icon {
  color: hsl(var(--accent-foreground));
}
```

## User Experience Guidelines

### 1. Performance
- **Instant Response**: Dropdown appears within 50ms of typing "/"
- **Smooth Filtering**: Real-time search with no perceptible delay
- **Fast Execution**: Commands execute within 100ms
- **Optimized Rendering**: Virtual scrolling for large command lists (future)

### 2. Accessibility
- **Screen Reader Support**: Proper ARIA labels and live regions
- **Keyboard Navigation**: Full functionality without mouse
- **Focus Management**: Clear focus indicators using project's focus ring
- **High Contrast**: Automatic support via CSS custom properties
- **Reduced Motion**: Respects ``prefers-reduced-motion`` setting

### 3. Error Handling
- **Graceful Degradation**: Fallback to basic editor if slash commands fail
- **User Feedback**: Toast notifications for failed operations
- **Recovery**: Undo/redo support for all command executions
- **Validation**: Command availability based on current editor state

## Testing Strategy

### 1. Unit Tests
- Command registration and retrieval
- Search/filtering functionality
- Individual command execution
- Keyboard navigation logic

### 2. Integration Tests
- Editor integration with slash commands
- Command execution in various editor states
- Content serialization and deserialization

### 3. E2E Tests
- Complete user workflows
- Cross-browser compatibility
- Performance benchmarks
- Accessibility compliance

## Future Enhancements

### 1. Customization
- **User-defined Commands**: Allow users to create custom commands
- **Command Shortcuts**: Keyboard shortcuts for frequently used commands
- **Command Grouping**: Organize commands into collapsible categories

### 2. Advanced Features
- **Command History**: Recently used commands at top
- **Smart Suggestions**: AI-powered command recommendations
- **Collaborative Commands**: Commands that work in real-time collaboration
- **Plugin System**: Third-party command extensions

### 3. Analytics
- **Usage Tracking**: Monitor which commands are used most
- **Performance Metrics**: Track command execution times
- **User Behavior**: Analyze search patterns and preferences

## Dependencies

### Required Libraries (Already Installed)
- **@tiptap/react**: Rich text editor framework ✅
- **@tiptap/starter-kit**: Basic TipTap extensions ✅
- **@tiptap/suggestion**: Suggestion extension for slash commands ✅
- **tippy.js**: Tooltip and popover positioning ✅
- **lucide-react**: Icon library ✅
- **React**: UI framework ✅
- **TypeScript**: Type safety ✅

### New Dependencies to Install
```bash
# No additional dependencies required
# All necessary packages already available in project
```

### Optional Future Enhancements
- **@tiptap/extension-table**: Table support (Phase 4+)
- **@tiptap/extension-collaboration**: Real-time collaboration
- **fuse.js**: Advanced fuzzy search with scoring
- **@tanstack/react-virtual**: Virtual scrolling for large command lists

## Migration & Compatibility

### Content Migration Strategy
- **Dual Storage**: Maintain both legacy ``content`` and new ``contentJson``/``contentHtml`` fields
- **Gradual Migration**: Background migration script to convert existing posts
- **Runtime Fallback**: Display logic handles both old and new content formats
- **No Data Loss**: Legacy content preserved during transition period

### Editor Compatibility
- **Progressive Enhancement**: Enhanced editor loads only when user opts in
- **Fallback Mode**: Basic textarea editor remains available
- **Feature Detection**: Graceful degradation if TipTap fails to load
- **Mobile Support**: Touch-friendly interface with larger tap targets

### Integration Points
- **Post Creation**: Enhanced editor in ``post-creation-form.tsx``
- **Post Editing**: Seamless editing of both legacy and new content
- **Content Display**: ``RenderPostContent`` component handles both formats
- **Search**: Full-text search works with both content formats

☐ **PHASED TASK CHECKLIST**

☐ *Phase 0 – Database Schema & Migration*
    ☐ Add ``contentJson`` (TipTap JSON) & ``contentHtml`` (rendered) fields to ``posts`` table in ``convex/schema.ts``
    ☐ Add same fields to ``post_versions`` table for version history
    ☐ Make legacy ``content`` field optional (maintain backward compatibility)
    ☐ Add Zod validation schemas for TipTap JSON content structure
    ☐ Regenerate Convex types (``npx convex codegen``)
    ☐ Write migration script ``scripts/migrate-post-content.ts`` to migrate ALL existing posts immediately
    ☐ Update ``createPost`` and ``editPost`` mutations with Convex + Zod validation
    ☐ Update ``RenderPostContent`` component to handle both legacy and new formats
    ☐ Test migration with sample posts and validate content integrity
    ☐ Update search indexes and query logic (``convex/schema.ts``, ``convex/search.ts``, ``convex/posts.ts``) to index and query ``contentHtml`` (fallback to legacy ``content``)
    ☐ Extend ``convex/postVersions.ts`` schema and insertion logic to snapshot ``contentJson`` and ``contentHtml`` for historical versions

☐ *Phase 1 – Core Slash Command Infrastructure*
    ☐ Create TipTap extension ``components/rich-text/extensions/slash-command.ts``
    ☐ Implement command registry ``components/rich-text/slash-commands/constants.ts`` (following existing editor constants pattern)
    ☐ Define 10 core commands in fixed order: Paragraph, Heading 1, Heading 2, Bullet List, Numbered List, Quote, Divider, Code Block, Link, Media
    ☐ Create React hook ``hooks/useSlashCommands.ts`` for state management
    ☐ Define TypeScript interfaces for ``SlashCommand`` and ``SlashCommandState``
    ☐ Unit tests for command filtering, execution, and keyboard navigation
    ☐ Integration tests with TipTap editor instance

☐ *Phase 2 – UI Components & Styling*
    ☐ Build ``SlashCommandMenu.tsx`` with responsive design (Tippy.js for desktop, Drawer for mobile)
    ☐ Implement mobile detection and conditional rendering (desktop dropdown vs mobile drawer)
    ☐ Create ``CommandItem.tsx`` component with proper hover/focus states and larger mobile touch targets
    ☐ Implement keyboard navigation (Arrow keys, Enter, Escape, Tab)
    ☐ Add comprehensive ARIA labels and accessibility features
    ☐ Style components using project's design tokens and CSS variables
    ☐ Add smooth animations and transitions (respecting prefers-reduced-motion)
    ☐ Test responsive behavior and touch interactions on mobile devices
    ☐ Visual regression tests for different themes and screen sizes

☐ *Phase 3 – Editor Integration & Testing*
    ☐ Update ``RichTextEditorFull.tsx`` to include slash command extension
    ☐ Integrate slash command menu with existing editor toolbar
    ☐ Ensure compatibility with existing extensions (LinkBadge, Mention, Markdown)
    ☐ Update ``post-creation-form.tsx`` to use enhanced editor
    ☐ Update ``components/post-edit-modal.tsx`` and ``components/post-form-fields.tsx`` to handle TipTap JSON & HTML
    ☐ Update display components (``PostDetail``, ``PostCard``, ``PostPreview``) to render ``contentHtml`` with fallback
    ☐ Test content serialization/deserialization with new commands
    ☐ E2E tests: create posts with various slash commands
    ☐ Performance testing: menu responsiveness and command execution speed
    ☐ Cross-browser compatibility testing
    ☐ **UPDATED** ``components/post-form-fields.tsx`` – validation & input handling for TipTap JSON content
    ☐ **UPDATED** ``lib/render-post-content.tsx`` – enhanced HTML rendering for new TipTap nodes
    ☐ **NEW** ``playwright/tests/slash-commands.spec.ts`` – comprehensive E2E test suite
    ☐ **NEW** ``components/rich-text/slash-commands/__tests__/integration.test.tsx`` – integration tests


==============
PHASE 0 – Database Schema & Migration
==============

*Affected files*
- **UPDATED** ``convex/schema.ts`` – add ``contentJson``, ``contentHtml`` fields; make ``content`` optional
- **NEW** ``scripts/migrate-post-content.ts`` – migration script to backfill existing posts
- **UPDATED** ``convex/posts.ts`` – update ``createPost``/``editPost`` mutations for dual storage
- **UPDATED** ``lib/render-post-content.tsx`` – handle both legacy and TipTap content formats
- **UPDATED** ``components/post-creation-form.tsx`` – pass TipTap JSON to mutations
- **UPDATED** Post display components – use ``contentHtml`` with fallback to legacy ``content``
- **UPDATED** ``convex/search.ts`` – update search logic for new content fields
- **UPDATED** ``convex/postVersions.ts`` – snapshot new content fields

*Changes*
1. **Schema Updates**: Add ``contentJson: v.optional(v.any())`` and ``contentHtml: v.optional(v.string())`` to both ``posts`` and ``post_versions`` tables
2. **Type Generation**: Run ``npx convex codegen`` to update TypeScript types
3. **Migration Script**: Convert existing markdown/HTML content to TipTap JSON format using ``generateJSON()`` from TipTap, then render to HTML
4. **Mutation Updates**: Accept ``contentJson`` parameter, generate HTML using server-side rendering, store both formats
5. **Display Logic**: Update ``RenderPostContent`` to prioritize ``contentHtml`` over legacy ``content``
6. **Backward Compatibility**: Maintain fallback rendering for posts without new content fields
7. **Search Updates**: Index ``contentHtml`` content in search indexes and update search queries to include it
8. **Post Version Updates**: Store ``contentJson`` and ``contentHtml`` in version history for accurate diffs

*Unit tests*
- Migration script correctly converts various content formats
- Mutations properly store both JSON and HTML representations
- Display components handle both legacy and new content formats
- Content serialization/deserialization maintains data integrity


==============
PHASE 1 – Core Slash-Command Infrastructure
==============

*Affected files*
- **NEW** ``components/rich-text/extensions/slash-command.ts`` – TipTap extension wrapping ``@tiptap/suggestion``
- **NEW** ``components/rich-text/slash-commands/commands.ts`` – Command registry with typed ``SlashCommand[]``
- **NEW** ``components/rich-text/slash-commands/types.ts`` – TypeScript interfaces and types
- **NEW** ``hooks/useSlashCommands.ts`` – React hook for command state management
- **UPDATED** ``components/rich-text/extensions/index.ts`` – export new slash command extension
- **TEST** ``components/rich-text/slash-commands/__tests__/`` – comprehensive test suite

*Changes*
1. **Type Definitions**: Create comprehensive TypeScript interfaces

   .. code:: typescript

       // components/rich-text/slash-commands/types.ts
       export interface SlashCommand {
           id: string;
           title: string;
           description?: string;
           searchTerms: string[];
           icon: React.ReactNode;
           category: 'formatting' | 'lists' | 'content' | 'advanced';
           execute: (editor: Editor, range: Range) => void;
           isAvailable?: (editor: Editor) => boolean;
           shortcut?: string;
       }

       export interface SlashCommandState {
           isOpen: boolean;
           selectedIndex: number;
           searchQuery: string;
           filteredCommands: SlashCommand[];
           activeRange: Range | null;
       }

2. **Command Registry**: Implement 10+ essential commands (Paragraph, Headings 1-3, Lists, Quote, Code, Link, Divider)
3. **TipTap Extension**: Wrap ``@tiptap/suggestion`` with custom logic for command execution and menu management
4. **React Hook**: Manage command state, filtering, keyboard navigation, and editor integration
5. **Search Logic**: Implement real-time filtering with relevance scoring (exact match > starts with > contains)

*Unit tests*
- Command registry returns all available commands with proper typing
- Search filtering works correctly with various query patterns
- Command execution properly modifies editor state
- Keyboard navigation cycles through filtered commands
- State management hook handles all user interactions


==============
PHASE 2 – UI Components
==============

*Affected files*
- **NEW** ``components/rich-text/slash-commands/SlashCommandMenu.tsx`` – main dropdown component
- **NEW** ``components/rich-text/slash-commands/CommandItem.tsx`` – individual command row
- **NEW** ``components/rich-text/slash-commands/CommandCategory.tsx`` – category separator (optional)
- **UPDATED** ``components/rich-text-editor-full.tsx`` – integrate slash command menu
- **TEST** ``components/rich-text/slash-commands/__tests__/menu.test.tsx`` – UI component tests

*Changes*
1. **Menu Component**: Dropdown positioned via Tippy.js with smooth animations and proper z-index
2. **Item Component**: Flex layout with icon, title, description, and interactive states
3. **Keyboard Navigation**: Full arrow key navigation, Enter/Tab to execute, Escape to close
4. **Styling**: Use project's design tokens (``--popover``, ``--accent``, ``--border``, etc.)
5. **Accessibility**: Complete ARIA implementation with ``role="listbox"``, ``aria-selected``, live regions
6. **Responsive Design**: Touch-friendly on mobile with larger tap targets
7. **Theme Support**: Automatic light/dark mode via CSS custom properties
8. **Performance**: Optimized rendering with proper React keys and memoization

*Unit tests*
- Component renders with provided commands and proper structure
- Keyboard navigation correctly updates selection state
- Mouse interactions (hover, click) work as expected
- ARIA attributes are properly set for screen readers
- Theme switching works correctly
- Command execution triggers proper callbacks


==============
PHASE 3 – Editor Integration & E2E
==============

*Affected files*
- **UPDATED** ``components/rich-text-editor-full.tsx`` – integrate slash command extension and menu
- **UPDATED** ``components/post-creation-form.tsx`` – handle TipTap JSON content format
- **UPDATED** ``components/post-edit-modal.tsx`` – handle TipTap JSON content format
- **UPDATED** ``components/post-card.tsx``, ``components/post-detail.tsx``, ``components/post-preview.tsx`` – render ``contentHtml``
- **NEW** ``playwright/tests/slash-commands.spec.ts`` – comprehensive E2E test suite
- **NEW** ``components/rich-text/slash-commands/__tests__/integration.test.tsx`` – integration tests

*Changes*
1. **Editor Integration**: Add slash command extension to ``RichTextEditorFull`` alongside existing extensions
2. **Content Handling**: Update form to pass TipTap JSON to mutations instead of markdown/HTML
3. **Validation**: Ensure form validation works with new content structure
4. **Rendering**: Update ``RenderPostContent`` to handle all TipTap node types from slash commands
5. **Error Handling**: Graceful fallback if slash commands fail to load or execute
6. **Performance**: Lazy loading of slash command components to minimize bundle size
7. **Post Edit Integration**: Ensure edit flows pass updated content fields and regenerate HTML server-side

*Tests*
- **Integration Tests**: Editor with slash commands serializes/deserializes content correctly
- **E2E Scenarios**:
  - User types "/he" → selects "Heading 2" → content formatted correctly
  - User creates post with multiple slash commands → saves and displays properly
  - Keyboard navigation works across all commands
  - Mobile touch interactions function correctly
- **Performance Tests**: Menu appears within 50ms, commands execute within 100ms
- **Accessibility Tests**: Screen reader compatibility, keyboard-only navigation


==============
IMPLEMENTATION DECISIONS
==============

**Resolved Requirements:**

1. **Content Migration**: Migrate all existing posts immediately during deployment
2. **Command Extensibility**: Static command registry sufficient (leverages TipTap's extensibility)
3. **Mobile UX**: Use "/" trigger but render menu inside shadcn Drawer component for mobile
4. **Performance**: No virtual scrolling needed for initial command set
5. **Content Validation**: Implement server-side validation using Convex + Zod
6. **Collaboration**: Not applicable (no collaborative editing planned)
7. **Analytics**: Add as bonus research item for future phases
8. **Keyboard Shortcuts**: No global shortcuts needed
9. **Command Categories**: Flat list with specific order: Paragraph, Heading 1, Heading 2, Bullet List, Numbered List, Quote, Divider, Code Block, Link, Media
10. **Undo/Redo**: TipTap's built-in history handling is sufficient

**Command Order & Constants:**
Commands will be stored in ``components/rich-text/slash-commands/constants.ts`` following the pattern from the existing editor constants, with the specific order: Paragraph → Heading 1 → Heading 2 → Bullet List → Numbered List → Quote → Divider → Code Block → Link → Media.

**Mobile Implementation:**
On mobile devices (detected via screen size), the slash command menu will render inside a shadcn Drawer component (``@/components/ui/drawer``) instead of a floating dropdown for better touch interaction.

**Content Validation:**
Server-side validation will be implemented using Convex function validation with Zod schemas to ensure TipTap JSON content integrity and prevent malicious content injection.

**Future Enhancements:**
- Usage analytics for command optimization (research phase)
- Additional content types (tables, callouts) in later phases
- Performance optimizations as command list grows

==============
BONUS RESEARCH ITEMS
==============

☐ **Analytics Research** (Future Phase)
    ☐ Research analytics solutions for tracking slash command usage
    ☐ Design event schema for command interactions (trigger, selection, execution)
    ☐ Evaluate privacy-friendly analytics options (self-hosted vs third-party)
    ☐ Plan data collection strategy for command optimization
    ☐ Design dashboard for command usage insights
    ☐ Consider A/B testing framework for command ordering optimization
