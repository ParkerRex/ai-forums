---

.. task checklist ------------------------------------------------------------------------------------------------------

☐ **Phase 0** – Sign-in page route
☐ **Phase 1** – Middleware (unauth redirect only)
☐ **Phase 2** – Server wrappers for paid-member guard
☐ **Phase 3** – Automated tests

---

Phase 0 – *app/sign-in/page.tsx* (new)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Affected files
* ``app/sign-in/page.tsx`` – new route with full-page Clerk ``<SignIn />`` experience.

Concise changes
* Render ``<SignIn afterSignInUrl={redirectParam || "/members"} />`` where ``redirectParam`` is extracted from ``searchParams.redirect_url``.
* Apply VAI design tweaks via Clerk ``appearance`` props (reuse modal styles).

Phase 1 – *middleware.ts* update
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Affected files
* ``middleware.ts`` – extend protected route matcher; add explicit ``unauthorizedUrl`` redirect.

Concise changes
* Replace ``createRouteMatcher(["/server"])`` with ``createRouteMatcher(["/server(.*)", "/members(.*)"])``.
* Change guard call to ``await auth.protect({ unauthorizedUrl: `/sign-in?redirect_url=${encodeURIComponent(req.nextUrl.pathname)}` })`` so unauthenticated users are redirected instead of receiving a 401.

Phase 2 – Server wrappers for paid-member guard
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Affected files
* ``app/members/page.tsx`` – convert to **server** wrapper that defers to existing client file.
* ``app/members/[slug]/page.tsx`` – same pattern.

Concise changes
#. Create a *client* companion file for each page (rename the existing file to ``page-client.tsx`` if not already).
#. New server file (`page.tsx`):

   .. code:: tsx

       import { redirect } from "next/navigation";
       import { auth } from "@clerk/nextjs/server";
       import { api } from "@/convex/_generated/api";
       import MembersPageClient from "./page-client";

       export default async function MembersPage() {
         const { userId } = auth();
         if (!userId) redirect(`/sign-in?redirect_url=/members`);

         const member = await api.auth.current({ userId });
         if (!member || member.tier === "free" || member.subscriptionStatus !== "active") {
           redirect("/pricing");
         }

         return <MembersPageClient />;
       }

#. Repeat for `app/members/[slug]/page.tsx`, redirecting unauth or unpaid as above but preserving the slug path in return URL.
#. Delete the previously-planned `use-auth-redirect` hook (no longer needed).

Phase 3 – Tests
~~~~~~~~~~~~~~~
Affected files
* ``playwright/member-access.spec.ts`` *(new)* – E2E test.
* ``components/__tests__/auth-redirect.test.tsx`` *(new)* – unit test for hook.

Concise test plan
* **Playwright**:
  1. Visit ``/members`` as guest ⇒ expect redirect to ``/sign-in``.
  2. Sign in with *free* test account ⇒ visit ``/members`` ⇒ expect redirect to ``/pricing``.
  3. Log in with paid test account ⇒ visit ``/members`` ⇒ member grid loads.
* **React test**: Render server component logic is not unit-testable; instead unit-test a utility (if extracted) or rely on Playwright for full coverage. 