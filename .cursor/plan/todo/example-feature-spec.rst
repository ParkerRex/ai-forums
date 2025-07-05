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
- **Quote/Blockquote** - Indented quote block
- **Code Block** - Syntax-highlighted code block

#### Lists
- **Bullet List** - Unordered list with bullet points
- **Numbered List** - Ordered list with numbers
- **Checklist** - Interactive checkbox list items

#### Media & Content
- **Link** - Insert/edit hyperlink
- **Image** - Insert image from upload or URL
- **Video** - Embed video content
- **Divider** - Horizontal rule/separator line

#### Advanced (Optional)
- **Table** - Insert data table
- **Callout** - Highlighted information box
- **Toggle** - Collapsible content section

### 3. User Interface

#### Dropdown Menu
- **Positioning**: Appears below the "/" character
- **Styling**: Clean, modern dropdown with subtle shadow
- **Max Height**: Scrollable if too many commands
- **Width**: Fixed width (e.g., 240px) for consistency

#### Command Items
- **Icon**: Visual representation of each command
- **Title**: Clear, descriptive name
- **Description**: Optional brief explanation
- **Keyboard Navigation**: Arrow keys to navigate, Enter to select, Escape to close

#### Visual States
- **Default**: Neutral background
- **Hover**: Light background highlight
- **Selected**: Distinct background color for keyboard navigation
- **Loading**: Spinner for commands that require processing

## Technical Architecture

### 1. Core Components

#### Command Definition
```typescript
type SlashCommand = {
  id: string;
  title: string;
  description?: string;
  searchTerms: string[];
  icon: ReactNode;
  category: 'formatting' | 'lists' | 'media' | 'advanced';
  command: (editor: Editor, range: Range) => void;
  isAvailable?: (editor: Editor) => boolean;
}
```

#### Command Registry
- Central registry of all available commands
- Support for dynamic command registration
- Category-based organization
- Conditional availability based on context

#### Suggestion Engine
- Text matching against command titles and search terms
- Fuzzy search support for typo tolerance
- Ranking algorithm for relevance
- Configurable search sensitivity

### 2. Editor Integration

#### TipTap Extensions
- **Suggestion Extension**: Core functionality for "/" detection
- **Custom Slash Command Extension**: Wrapper for command system
- **Command Execution**: Integration with TipTap's command chain API

#### State Management
```typescript
type EditorState = {
  editor: Editor | null;
  activeRange: Range | null;
  commandMenuOpen: boolean;
  selectedCommandIndex: number;
  searchQuery: string;
}
```

### 3. Data Storage

#### Content Format
- **Structured Data**: Store editor content as JSON (TipTap format)
- **Rendered HTML**: Pre-rendered HTML for fast display
- **Dual Storage**: Both formats stored in database

#### Database Schema
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  content JSONB,           -- TipTap JSON structure
  html_content TEXT,       -- Rendered HTML
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
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
  searchTerms: ['h1', 'heading', 'title', 'large'],
  icon: <Heading1Icon />,
  command: (editor, range) => {
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
  searchTerms: ['ul', 'bullets', 'unordered'],
  icon: <ListIcon />,
  command: (editor, range) => {
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

### 1. Dropdown Container
```css
.slash-command-dropdown {
  /* Positioning */
  position: absolute;
  z-index: 50;

  /* Dimensions */
  width: 240px;
  max-height: 330px;

  /* Appearance */
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
              0 2px 4px -1px rgba(0, 0, 0, 0.06);

  /* Animation */
  transition: all 150ms ease-in-out;

  /* Scrolling */
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.slash-command-dropdown::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
```

### 2. Command List Container
```css
.slash-command-list {
  padding: 4px;
  scroll-behavior: smooth;
}
```

### 3. Individual Command Items
```css
.slash-command-item {
  /* Layout */
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px;

  /* Typography */
  text-align: left;
  font-size: 14px;
  color: #374151;

  /* Appearance */
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  /* Transitions */
  transition: background-color 150ms ease-in-out,
              color 150ms ease-in-out;
}

/* Hover State */
.slash-command-item:hover {
  background-color: #f3f4f6;
  color: #111827;
}

/* Selected/Active State (keyboard navigation) */
.slash-command-item.selected {
  background-color: #e5e7eb;
  color: #111827;
}

/* Focus State */
.slash-command-item:focus {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}
```

### 4. Icon Library & Specifications

#### Recommended Icon Library
**Lucide React** - Modern, consistent, and lightweight icon library
```bash
npm install lucide-react
```

#### Icon Mapping for Commands
```typescript
import {
  Text,           // Paragraph
  Heading1,       // Heading 1
  Heading2,       // Heading 2
  Heading3,       // Heading 3
  TextQuote,      // Quote/Blockquote
  Code,           // Code Block
  List,           // Bullet List
  ListOrdered,    // Numbered List
  CheckSquare,    // Checklist
  Link,           // Link
  ImageIcon,      // Image
  Video,          // Video
  Minus,          // Divider/HR
  Table,          // Table
  Info,           // Callout
  ChevronDown,    // Toggle/Collapsible
} from 'lucide-react';
```

#### Icon Usage in Commands
```typescript
const commands = [
  {
    title: "Paragraph",
    icon: <Text className="slash-command-icon" />,
    // ...
  },
  {
    title: "Heading 1",
    icon: <Heading1 className="slash-command-icon" />,
    // ...
  },
  {
    title: "Code Block",
    icon: <Code className="slash-command-icon" />,
    // ...
  },
  // ...
];
```

#### Icon Styling
```css
.slash-command-icon {
  /* Container */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  /* Dimensions */
  width: 24px;
  height: 24px;

  /* Icon styling */
  color: #6b7280;
  stroke-width: 1.5; /* Lucide specific */
}

.slash-command-item:hover .slash-command-icon,
.slash-command-item.selected .slash-command-icon {
  color: #374151;
}
```

#### Alternative Icon Libraries
If not using Lucide, here are alternatives with similar icons:

**Heroicons**
```bash
npm install @heroicons/react
```

**React Icons** (includes multiple icon sets)
```bash
npm install react-icons
```

**Tabler Icons**
```bash
npm install @tabler/icons-react
```

#### Icon Requirements
- **Size**: 16px - 24px (24px recommended for touch targets)
- **Stroke Width**: 1.5px for optimal clarity
- **Style**: Outline/stroke style preferred over filled
- **Consistency**: All icons should be from the same library/style
- **Accessibility**: Icons should have proper aria-labels when used alone
```

### 5. Command Text
```css
.slash-command-text {
  flex: 1;
}

.slash-command-title {
  font-weight: 500;
  line-height: 1.2;
  margin: 0;
}

.slash-command-description {
  font-size: 12px;
  color: #6b7280;
  margin: 2px 0 0 0;
  line-height: 1.3;
}
```

### 6. Category Separators (Optional)
```css
.slash-command-category {
  padding: 8px 12px 4px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-top: 1px solid #f3f4f6;
  margin-top: 4px;
}

.slash-command-category:first-child {
  border-top: none;
  margin-top: 0;
}
```

### 7. Loading States
```css
.slash-command-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #6b7280;
}

.slash-command-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### 8. Empty State
```css
.slash-command-empty {
  padding: 16px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}
```

### 9. Dark Mode Support
```css
@media (prefers-color-scheme: dark) {
  .slash-command-dropdown {
    background: #1f2937;
    border-color: #374151;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3),
                0 2px 4px -1px rgba(0, 0, 0, 0.2);
  }

  .slash-command-item {
    color: #d1d5db;
  }

  .slash-command-item:hover,
  .slash-command-item.selected {
    background-color: #374151;
    color: #f9fafb;
  }

  .slash-command-icon {
    color: #9ca3af;
  }

  .slash-command-item:hover .slash-command-icon,
  .slash-command-item.selected .slash-command-icon {
    color: #d1d5db;
  }

  .slash-command-description {
    color: #9ca3af;
  }

  .slash-command-category {
    color: #6b7280;
    border-top-color: #374151;
  }
}
```

### 10. Animation & Transitions
```css
/* Dropdown entrance animation */
.slash-command-dropdown-enter {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.slash-command-dropdown-enter-active {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: opacity 150ms ease-out,
              transform 150ms ease-out;
}

/* Dropdown exit animation */
.slash-command-dropdown-exit {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.slash-command-dropdown-exit-active {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
  transition: opacity 100ms ease-in,
              transform 100ms ease-in;
}
```

### 11. Responsive Design
```css
/* Mobile adjustments */
@media (max-width: 640px) {
  .slash-command-dropdown {
    width: 280px;
    max-width: calc(100vw - 32px);
  }

  .slash-command-item {
    padding: 12px;
    font-size: 16px; /* Larger touch targets */
  }

  .slash-command-icon {
    width: 20px;
    height: 20px;
  }
}
```

### 12. Accessibility Enhancements
```css
/* High contrast mode */
@media (prefers-contrast: high) {
  .slash-command-dropdown {
    border-width: 2px;
    border-color: #000;
  }

  .slash-command-item.selected {
    background-color: #000;
    color: #fff;
  }

  .slash-command-item:focus {
    outline-width: 3px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .slash-command-dropdown,
  .slash-command-item {
    transition: none;
  }

  .slash-command-spinner {
    animation: none;
  }
}
```

## User Experience Guidelines

### 1. Performance
- **Instant Response**: Dropdown should appear within 50ms of typing "/"
- **Smooth Filtering**: Real-time search with no perceptible delay
- **Fast Execution**: Commands should execute within 100ms

### 2. Accessibility
- **Screen Reader Support**: Proper ARIA labels and announcements
- **Keyboard Only**: Full functionality without mouse
- **High Contrast**: Support for high contrast mode
- **Focus Management**: Clear focus indicators

### 3. Error Handling
- **Graceful Degradation**: Fallback if commands fail
- **User Feedback**: Clear error messages for failed operations
- **Recovery**: Ability to undo command execution

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

### Required Libraries
- **TipTap**: Rich text editor framework
- **@tiptap/suggestion**: Suggestion extension for TipTap
- **Tippy.js**: Tooltip and popover positioning
- **React**: UI framework
- **TypeScript**: Type safety
- **Lucide React**: Icon library for command icons

### Installation Commands
```bash
# Core editor dependencies
npm install @tiptap/react @tiptap/starter-kit @tiptap/suggestion

# UI and positioning
npm install tippy.js

# Icons
npm install lucide-react

# TypeScript (if not already installed)
npm install -D typescript @types/react
```

### Optional Libraries
- **Fuse.js**: Advanced fuzzy search
- **React Virtual**: Virtual scrolling for large command lists
- **Framer Motion**: Smooth animations and transitions

## Migration Considerations

### From Existing Editors
- **Content Migration**: Convert existing content to TipTap format
- **Command Mapping**: Map existing toolbar actions to slash commands
- **User Training**: Provide onboarding for new interaction pattern

### Backward Compatibility
- **Dual Interface**: Support both slash commands and traditional toolbar
- **Progressive Enhancement**: Gradually introduce slash commands
- **Fallback Options**: Ensure all functionality remains accessible
