# GitHub-Style Comment System Implementation Plan

## ✅ Completed Features

### Core Comment System
- **Flat comment timeline** - All comments at same level with vertical timeline
- **GitHub-style comment input** - Markdown editor with Write/Preview tabs
- **Keyboard shortcuts**
  - `Cmd/Ctrl+B` - Bold text
  - `Cmd/Ctrl+I` - Italic text
  - `Cmd/Ctrl+K` - Insert link
  - `Cmd/Ctrl+E` - Inline code
- **Proper markdown rendering** - Using react-markdown
- **File attachments** - Via paperclip button
- **Reply functionality** - Shows "replied to @username"
- **Edit/Delete** - For own comments
- **Share link** - Copy comment permalink
- **Voting system** - Custom feature beyond GitHub

### Post Editing
- **Inline editing** - No modal, edit in place
- **Edit button** - Next to post title
- **Same form fields** - Consistent with creation

## 🚀 Features to Implement

### High Priority
1. **Syntax Highlighting for Code Blocks**
   - Use existing highlight.js installation
   - Auto-detect language from code block
   - Support ```language syntax
   - Add copy button to code blocks

2. **@ Mentions with Autocomplete**
   - Dropdown when typing @
   - Search members in real-time
   - Insert formatted mention on selection
   - Link to member profile

3. **Drag & Drop File Upload**
   - Drop images/files directly into textarea
   - Show upload progress
   - Auto-insert markdown for images
   - Support paste from clipboard

### Medium Priority
4. **Quote Reply**
   - Select text and quote in reply
   - Format as markdown blockquote
   - Preserve attribution

5. **Task Lists**
   - Support `- [ ]` and `- [x]` syntax
   - Make checkboxes interactive
   - Update comment on check/uncheck

6. **Comment Reactions**
   - Emoji reactions (👍 😄 🎉 ❤️ 🚀 👀)
   - Show reaction counts
   - Add/remove reactions

### Low Priority
7. **Saved Replies**
   - Template responses
   - Quick insert menu
   - Personal reply library

8. **Slash Commands**
   - `/close` - Close issue/post
   - `/assign` - Assign to member
   - `/label` - Add labels
   - Command palette

9. **Enhanced Threading**
   - Better visual indicators for replies
   - Collapse/expand thread chains
   - Jump to parent comment

10. **Markdown Extensions**
    - Tables with better styling
    - Footnotes support
    - Math equations (LaTeX)
    - Mermaid diagrams

## 🐛 Fixes Needed

1. **Tab Behavior in Code Blocks**
   - Current: Always inserts 2 spaces
   - Should: Detect if in code block and indent properly
   - Support shift+tab for outdent

2. **Language Detection**
   - Auto-detect language if not specified
   - Support more language aliases
   - Show language label on code blocks

3. **Code Block Styling**
   - Add line numbers option
   - Improve dark mode colors
   - Better overflow handling

## 📊 Technical Considerations

### Performance
- Lazy load syntax highlighting
- Debounce @ mention search
- Virtualize long comment lists
- Optimize markdown parsing

### Accessibility
- Keyboard navigation for mentions
- Screen reader support
- ARIA labels for reactions
- Focus management

### Mobile
- Touch-friendly toolbar
- Responsive preview
- Swipe gestures for actions
- Optimized keyboard handling