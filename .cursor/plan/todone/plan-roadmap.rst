make a new component that goes above the recent ai nres in the siderbar.. it says up next.. then its a nice card with a @table.tsx inside it ful of the issues from our repo. 

the purpose is so that users can see what we are working on and what we are planning to work on. 

it doesnt matter the particular order... just show the issues in a nice card. 

we show the issue name and can wrap the table so the row gets taller if the issue name is long. 

we already have the @lib/github.ts setup so it shouldnt be too bad... move the submit bug button in the footer to the top of the new `sidebar-roadmap-component.tsx`

☐ Phase 1 – GitHub issues fetch layer
☐ Phase 2 – Sidebar roadmap UI & integration

.. OPEN QUESTIONS ­– Please clarify before implementation if possible
* Should we limit the number of issues displayed (e.g. first 5) or render all open issues?
* Do we want any label-based filtering (e.g. only "enhancement", "roadmap")?
* Should rows be clickable to open the GitHub issue in a new tab?

.. DECISIONS (confirmed by user)
* No filtering – just list issue titles.
* Fetch 10 issues per page (GitHub ``per_page=10``). Sidebar component will include a *Load more* button to request next page lazily.
* Each row links directly to the GitHub issue in a new tab.

==============================
Phase 1 – GitHub issues fetch layer
==============================

Affected files
--------------
* **app/api/github/issues/route.ts** – new **Next.js** route that proxies the GitHub REST "/issues" endpoint securely via server-side token.
* **lib/github.ts** – add "useGitHubIssues" SWR hook that fetches from the new route; keep existing exports.
* **lib/__tests__/github.test.tsx** – new tests for the hook (mock fetch & ensure proper shaping / error cases).

Code changes (concise)
---------------------
*Create "app/api/github/issues/route.ts"*::

    POST-only route → 405 on others.
    Read "process.env.GITHUB_TOKEN" and forward GET to
    "https://api.github.com/repos/joinvai/vai-vex/issues?state=open&per_page=10".
    Passthrough query params (e.g. "page") so UI can paginate lazily.
    Return JSON array of simplified issue objects: "{ id, number, title, html_url }".

*Extend "lib/github.ts"*::

    export function useGitHubIssues(page = 1) → SWR
    (key: `/api/github/issues?page=${page}`) that returns issues list,
    "isLoading", and "error" flags like "useLastCommit" does.

*Add tests*::

    – Mock "global.fetch" to capture outbound call & return fake data.
    – Verify hook transforms response & handles errors.


==============================
Phase 2 – Sidebar roadmap UI & integration
==============================

Affected files
--------------
* **components/sidebar-roadmap-component.tsx** – new "Up Next" card with table.
* **components/post-sidebar.tsx** – import & render new component **above** "Recent AI News".
* **components/footer.tsx** – remove "<BugReportButton />".
* **components/sidebar-roadmap-component.test.tsx** – unit test (render & verify rows).

Code changes (concise)
---------------------
*Create "components/sidebar-roadmap-component.tsx"*::

    "use client";
    import "Card" primitives, "Table" primitives, "BugReportButton" & "useGitHubIssues".

    Component renders:
    - CardHeader → title "Up Next" + "BugReportButton" (aligned right).
    - CardContent →
        – Loading skeleton while "isLoading".
        – "Table" with one column "Issue". Each cell contains a link (``target="_blank" rel="noopener noreferrer"``) wrapping ``issue.title`` (wrap long lines with "break-words").
        – *Load more* button below the table to fetch the next page via ``page++`` when clicked.
        – Optional caption linking to full GitHub issues page.
    - Handle "error" via "ErrorDisplay" component.

*Update "components/post-sidebar.tsx"*::

    import SidebarRoadmapComponent and place at top of outer "div".

*Update "components/footer.tsx"*::

    Remove the "<BugReportButton />" import & JSX.

*Add tests*::

    – Render component with mocked "useGitHubIssues" returning sample issues.
    – Assert table rows count matches sample & "BugReportButton" present.
    – Snapshot for regressions.