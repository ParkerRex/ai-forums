☑ Phase 1 – REVERTED: Paperclip should accept ALL file types (docs, PDFs, videos, images)
☑ Phase 1 – Restored original functionality for paperclip upload in `components/enhanced-comment-input.tsx`
☑ Phase 2 – Tests remain valid for `validateDocumentFile` helper (kept for potential future use)

-----------------------------------------------------------------
**CORRECTION**: The paperclip button should accept ALL file types, not just documents.

Phase 1 – Restore paperclip to accept all media types
Affected files:
• **components/enhanced-comment-input.tsx**

1. components/enhanced-comment-input.tsx
   • Restored `<input accept>` to include all types:
     `"image/*,video/*,.pdf,.doc,.docx,.txt,.md,.ppt,.pptx,.xls,.xlsx,.csv"`.
   • Restored call to `validateMediaFile()` instead of `validateDocumentFile()`.
   • Removed restriction that rejected images/videos.
   • Paperclip button now accepts: images, videos, PDFs, Word docs, PowerPoint, Excel, text files, etc.

The `validateDocumentFile` helper remains in the codebase for potential future use but is not currently used.

-----------------------------------------------------------------
Phase 2 – Unit tests
Affected files:
• **lib/__tests__/upload-media.test.ts**

Tests for `validateDocumentFile` remain valid and demonstrate the helper works correctly, even though it's not currently used in the UI. 