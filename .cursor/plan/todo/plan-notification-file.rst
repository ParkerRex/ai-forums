☐ **Phase 1 – Backend (Convex)**

  *Affected files*: ``convex/notifications.ts``, ``convex/comments.ts``, ``convex/posts.ts``, ``convex/test/notifications.test.ts``
  *Summary*: add reusable helper to create notifications, trigger notifications on comment mentions, replies, and post mentions, add unit tests.

  #. ☐ Add ``insertNotification`` internal helper in *``convex/notifications.ts``*.
  #. ☐ Fire *mention* and *reply* notifications from *``comments.createComment``*.
  #. ☐ Fire *mention* notifications from *``posts.createPost``*.
  #. ☐ Create *``convex/test/notifications.test.ts``* covering mention + reply cases and self-mention suppression.

☐ **Phase 2 – Frontend (UI)**

  *Affected file*: ``components/notification-dropdown.tsx``
  *Summary*: resolve entity link logic for new notifications.

  #. ☐ Update ``getNotificationLink`` to construct URLs for post and comment notifications.
  #. ☐ Manual QA – verify navigation & unread-count behaviour.

☐ **Phase 3 – Editor Extension Cleanup**

  *Affected files & dirs*: ``extensions/``, ``components/rich-text-editor-full.tsx`` (and any other editor consumers)
  *Summary*: relocate Tiptap extensions into a scoped folder and remove stray root directory.

  #. ☐ Create ``components/rich-text/extensions`` (or ``lib/tiptap``) and move ``mention.ts`` + ``link-badge.ts`` there.
  #. ☐ Add barrel ``index.ts`` exporting both extensions.
  #. ☐ Update all imports (currently only in rich-text editor) to new path.
  #. ☐ Delete the empty root ``extensions/`` directory.
  #. ☐ Run `tsc` to verify no stray imports.

*Task checklist (by phase)*

☐ **Phase 1 – Backend**

- ☐ insertNotification helper
- ☐ comment mention notifications
- ☐ comment reply notifications
- ☐ post mention notifications
- ☐ backend unit tests (notifications.test.ts)

☐ **Phase 2 – Frontend**

- ☐ update getNotificationLink logic
- ☐ manual QA unread & links 