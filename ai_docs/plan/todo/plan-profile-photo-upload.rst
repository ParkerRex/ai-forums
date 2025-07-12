
☐ Phase 1 – Backend: extend profile mutation
  • convex/members.ts → add ``avatarUrl`` (optional string) to ``updateMemberProfile`` args and patch logic.
    – Validate content (must start with https). «Also immediately delete the prior avatar via ``api.storage.deleteObject`` for guaranteed cleanup when a new one is provided»
  • convex/members.ts → update JSDoc comment & unit validator usage.
  • convex/_generated/api.d.ts → regenerate via `npx convex dev` (implicit).

☐ Phase 2 – Client + UI: avatar upload workflow
  • components/avatar-upload.tsx (NEW) – react component with:
    – file input → onChange: obtain presigned URL via ``api.storage.generateUploadUrl``
    – PUT file with fetch; show progress & preview; emit ``publicUrl`` back to parent via `onUpload(url)`
    – accept ``initialUrl``, ``onRemove`` props.
  • components/member-edit-form.tsx
    – import AvatarUpload; local state ``avatarUrl`` initialised from props.member.avatarUrl.
    – include AvatarUpload above bio field; update Save handler to pass ``avatarUrl`` in ``updateMemberProfile`` call.
    – ensure form dirty detection includes avatar change.
  • components/member-edit-modal.tsx → extend ``Member`` interface to include ``avatarUrl``.

☐ Phase 3 – Testing & cleanup
  • components/__tests__/member-edit-form.test.tsx (NEW) – mock ``api.storage.generateUploadUrl`` & ensure avatar URL propagates.
  • Update existing component tests that reference avatarUrl defaults (member-card, member-profile etc.) to include fallback logic—no code changes expected.
  • Add vitest snapshot for AvatarUpload.


Phase 1 – Backend changes
-------------------------
Affected files: convex/members.ts

1. Extend ``updateMemberProfile`` args::

    avatarUrl: v.optional(v.string()),

2. Inside handler:
   a. Save ``const oldUrl = member.avatarUrl`` before patch.
   b. If ``args.avatarUrl`` provided AND ``oldUrl`` && differs:
      i. Derive objectKey from ``oldUrl`` (split at '/uploads/').
      ii. ``await api.storage.deleteObject({objectKey})``  // guaranteed synchronous deletion.
   c. Include ``avatarUrl`` in patch payload.

3. Maintain validation (max length 500, etc.) + simple check on url:: ``/^https?:\/\//``

Phase 2 – Client/UI changes
---------------------------
Affected files: components/avatar-upload.tsx (new); components/member-edit-form.tsx; components/member-edit-modal.tsx

1. New AvatarUpload component
   • Props: ``initialUrl?: string``; ``onUpload: (url: string) => void``; ``onRemove?: () => void``.
   • Renders square avatar preview (size = 128) with overlay button to change.
   • On file select: validate type (image/png,jpeg,webp), size ≤ 5 MB; present cropping/resizing UI (square aspect). Cloudflare Images will handle final dimension resizing.
   • Calls ``const {uploadUrl, publicUrl} = await api.storage.generateUploadUrl({...})`` via ``useMutation``.
   • ``await fetch(uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file})``.
   • On success call ``onUpload(publicUrl)``.
   • Provide remove action (trash icon) that resets.

2. member-edit-form.tsx
   • add local state ``const [avatarUrl,setAvatarUrl] = useState(member.avatarUrl || "")``.
   • Render ``<AvatarUpload initialUrl={avatarUrl} onUpload={setAvatarUrl} onRemove={()=>setAvatarUrl("")} />``.
   • Update ``updateData`` to include ``avatarUrl``.
   • Expand ``isDirty`` logic: dirty if any field dirty OR ``avatarUrl !== member.avatarUrl``.

3. member-edit-modal.tsx: extend Member interface with ``avatarUrl?: string``.

Phase 3 – Tests
---------------
Affected files: new tests + adjust mocks

1. avatar-upload.test.tsx: simulate file selection; expect fetch PUT called and onUpload receives url.
2. member-edit-form.test.tsx: render with initial avatar; simulate upload; expect mutation includes new url.

Decisions
=========
* Client-side image cropping/resizing before upload: **Yes** – implemented via cropping modal in AvatarUpload.
* Max-dimension enforcement: handled by **Cloudflare Images** at delivery; no client-side dimension cap.
* Old avatar cleanup: **Guaranteed** – synchronous deletion of previous avatar object inside ``updateMemberProfile``. 