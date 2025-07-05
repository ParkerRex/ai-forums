☐ **Phase 1 – Backend GitHub integration**
☐ add `createFeatureRequest` Convex *action* in ``convex/github.ts``
☐ unit-test action in ``convex/test/github.test.ts`` (happy-path + error cases)

☐ **Phase 2 – UI modal & sidebar wiring**
☐ build ``components/feature-request-modal.tsx`` (form + upload logic)
☐ build ``components/feature-request-button.tsx`` (ghost text button trigger)
☐ insert button into ``components/sidebar-roadmap-component.tsx`` next to *Report Bug*
☐ UI tests in ``components/__tests__/feature-request-modal.test.tsx``

.. OPEN QUESTIONS – please clarify
* Do we want an additional ``feature request`` label on GitHub issues or just ``user submitted``?
* Maximum screenshot attachments per request? (default 5 like bug reports)

==============================
Phase 1 – Backend GitHub integration
==============================

Affected files
--------------
* **convex/github.ts** – add **createFeatureRequest** action.
* **convex/test/github.test.ts** – new tests for the action.

Concise changes
---------------
*Extend ``convex/github.ts``*::

    export const createFeatureRequest = action({
      args: {
        title: v.string(),
        description: v.string(),
        screenshotUrls: v.optional(v.array(v.string())),
      },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity().catch(() => undefined);
        const memberInfo = identity?.email ? `${identity.name || "Anonymous"} (${identity.email})` : "Anonymous user";

        const issueBody = `## Feature Description\n${args.description}\n\n---\n*Submitted by*: ${memberInfo}` +
          (args.screenshotUrls?.length ? `\n\n## Screenshots\n${args.screenshotUrls.map((u,i)=>`${i+1}. ![screenshot](${u})`).join("\n")}` : "");

        const response = await fetch(`${GITHUB_API_URL}/repos/${OWNER}/${REPO}/issues`, { /* similar headers */ });
        // body: { title: `[Feature] ${args.title}`, body: issueBody, labels: ["user submitted", "feature request"] }
        // error handling mirrors createBugReport.
      }
    });

*Add tests* – mock ``fetch`` to confirm request payload/labels and error propagation.

==============================
Phase 2 – UI modal & sidebar wiring
==============================

Affected files
--------------
* **components/feature-request-modal.tsx** – new dialog component.
* **components/feature-request-button.tsx** – new trigger button (text "Feature Request", ghost variant).
* **components/sidebar-roadmap-component.tsx** – import & render new button beside existing *BugReport* button.
* **components/__tests__/feature-request-modal.test.tsx** – react-testing-library tests.

Concise changes
---------------
*Create ``components/feature-request-button.tsx``*::

    "use client";
    import { useState } from "react";
    import { Button } from "@/components/ui/button";

    export function FeatureRequestButton() {
      const [open, setOpen] = useState(false);
      return (<>
        <Button variant="ghost" size="sm" className="text-xs"
                onClick={()=>setOpen(true)}>
          Request Feature
        </Button>
        <FeatureRequestModal isOpen={open} onClose={()=>setOpen(false)} />
      </>);
    }

*Create ``components/feature-request-modal.tsx``*::

    – follows structure of ``BugReportModal`` but with fields:
      • title (Input, required max 100)
      • description (RichTextEditor, required)
      • optional screenshot upload (reuse uploadMedia)
    – validates, uploads screenshots to R2, then calls ``api.github.createFeatureRequest``.
    – shows toast on success with issue link.

*Update ``components/sidebar-roadmap-component.tsx``*::

    import { FeatureRequestButton } from "./feature-request-button";
    // inside card footer / actions bar right after BugReportButton -> <FeatureRequestButton />

*Tests*::
    – render button, click to open modal, ensure form validation, mock action call. 