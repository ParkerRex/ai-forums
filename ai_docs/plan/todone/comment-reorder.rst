☑ **Phase 1 – Refactor comment-side upload UI**  
☑ unify file + gif state into `AttachmentItem[]` with `order`  
☑ replace local flex preview with `MediaPreviewGrid` and wire drag callbacks  
☑ accept `initialAttachments` + expose `onChangeAttachments` from `EnhancedCommentInput`  
☑ update submit logic to upload new files only, preserve order, cap 5  

☑ **Phase 2 – Extend backend for attachment edits**  
☑ add optional `attachments` arg to `editComment` mutation + validator mirror of `createComment`  
☑ save new `attachments` array and push previous state into `editHistory`  

☑ **Phase 3 – Wire edit flow in UI**  
☑ pass `comment.attachments` into `EnhancedCommentInput` when editing  
☑ on submit, call updated mutation with `content` + ordered `attachments`  
☑ enable delete via "X" button already provided in preview grid  
☑ ensure list rendered after save uses stored order  

───────────────────  
Phase 1 – UI refactor  
Affected files  
• `components/enhanced-comment-input.tsx` – rewrite attachment state, drag-drop, removal  
• `components/media-preview-grid.tsx` – no change, just reused  
• `components/media-preview-item.tsx` – no change  
• NEW `types/comment-attachment.ts` (if needed) – `AttachmentItem` interface  

Changes  
• Introduce `AttachmentItem { id, type, url, file?, mimeType, fileName, fileSize, order }`  
• `attachments` state → `AttachmentItem[]`; combine former `attachments`, `gifAttachments`, `attachmentPreviews`  
• `handleFileSelect` builds `AttachmentItem` with temporary `URL.createObjectURL` + uploads pending flag  
• `handleGifSelect` builds similar item with `type:"gif"`  
• Render:  
```tsx
<MediaPreviewGrid
  media={attachments.map(toMediaItem)}
  onReorder={reorderCb}
  onRemove={(id)=>setAttachments(a=>a.filter(i=>i.id!==id))}
/>
```  
• `reorderCb` maps new order back to `attachments` array  
• Submission:  
  – iterate through `attachments`  
  • if `file` present ⇒ upload via `uploadMedia`, replace `url`, strip `file`, update `mimeType`  
  • if remote ⇒ keep as-is  
  – build `AttachmentType[]` payload preserving current order  
• Add props:  
  – `initialAttachments?: AttachmentType[]` (convert to `AttachmentItem[]` in `useEffect`)  
  – remove separate gif logic  

Unit test ideas (vitest):  
• `arrayReorder` utility returns expected order id sequence  
• `buildPayload` uploads only items with `file`, leaves remote intact  

───────────────────  
Phase 2 – Backend mutation  
Affected file  
• `convex/comments.ts`  

Changes  
• `editComment` args → `{ commentId, content, attachments? }`  
  validator identical to `createComment.attachments`  
• **Delete removed attachments** – inside `editComment` compute diff between existing `comment.attachments` and new array; for each removed item derive its `objectKey` (everything after the bucket domain) and call `storage.deleteObject` action in `convex/storage.ts`.  
• `patch(commentId, { content, attachments, updatedAt, editedAt, editHistory })`  
• Preserve existing authorization + history logic  

Unit test (Convex migration tests):  
• editing comment with attachment removal triggers `deleteObject` and results in shorter `attachments` array  
• reordering persists (`order` checked)  

───────────────────  
Phase 3 – Comment edit integration  
Affected files  
• `components/comment-section.tsx`  

Changes  
• When `isEditing`, pass `initialAttachments={comment.attachments}` to input  
• Capture `attachments` from `onSubmit` callback  
• Call `editComment({ commentId, content, attachments })`  
• After save, local UI uses returned data; existing display path already consumes `comment.attachments`, so order will reflect backend array  

Resolved decisions  
* Attachments removed during edit will be deleted from Cloudflare R2 via `storage.deleteObject`.  
* The global maximum of **5 attachments per comment** is retained.  
