☐ **Phase 1 – Backend (Convex & Utilities)**

  *Affected files*: ``lib/upload-media.ts``, ``convex/github.ts``
  *Summary*: extend file-type support, improve GitHub issue formatting, and ensure robust error handling.

  #. ☐ **lib/upload-media.ts** – extend *validateMediaFile* to support *doc/docx* files with 20MB limit (matching PDF).
  #. ☐ **convex/github.ts** –
     
        - ensure ``attachmentUrls`` defaults to empty array to simplify logic.
        - enhance attachment rendering: use ``![Attachment](url)`` for images, ``[📎 filename](url)`` for documents.
        - include attachment metadata (filename, size) in issue body when available.
        - expose detailed GitHub API error messages for debugging.

  #. ☐ Unit-test *validateMediaFile* via **lib/__tests__/upload-media.test.ts** covering doc/docx validation.

☐ **Phase 2 – Frontend (Bug-report UI)**

  *Affected files*: ``components/bug-report-modal.tsx``
  *Summary*: leverage existing upload patterns, improve preview UX, and ensure proper error handling.

  #. ☐ Update file input ``accept`` to include ``.doc,.docx`` alongside existing types.
  #. ☐ Improve non-image previews: show document icon with filename/size, consistent with comment attachments.
  #. ☐ Add upload progress indicators during R2 upload (reuse existing toast pattern).
  #. ☐ Manual QA – test mixed attachments (image + PDF + doc) and verify GitHub issue formatting.

*Task checklist (by phase)*

☐ **Phase 1 – Backend**

- ☐ extend ``validateMediaFile`` for doc/docx (20MB limit)
- ☐ enhance GitHub attachment rendering with metadata
- ☐ default empty ``attachmentUrls`` array
- ☐ expose detailed GitHub API errors
- ☐ upload-media unit tests for doc/docx

☐ **Phase 2 – Frontend**

- ☐ file input accept doc/docx types
- ☐ document preview with icon/filename/size
- ☐ upload progress toast indicators
- ☐ manual QA mixed attachment types 