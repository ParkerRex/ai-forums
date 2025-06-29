Task Checklist
==============

Phase 1 – Theme audit foundations
☑ Create `audit-theme.ts` script  
☑ Wire `lint:theme` npm script  
☑ Add Jest tests for audit script  

Phase 2 – Replace hard-coded colors
☑ Update members page color classes  
☑ Update components & skeleton placeholders to use `bg-muted` with appropriate opacity  
☑ Run audit script until zero violations  

Phase 3 – Enforcement & visual verification
☑ Implement ESLint `no-raw-colors` rule & update config  
☑ Add Playwright dark-mode visual tests  
☑ Ensure CI passes with new checks  


Phase 1 – Theme audit foundations
---------------------------------
Affected files: *scripts/audit-theme.ts*, *package.json*, *scripts/__tests__/audit-theme.test.ts*

* Create `audit-theme.ts` Node script to read project files using glob; use regex to detect banned Tailwind classes. Print list & non-zero exit code if any found.
* Add Jest test file with mocked file contents.
* Wire npm script.

Phase 2 – Replace hard-coded colors with theme tokens
----------------------------------------------------
Affected files: *app/members/[id]/page.tsx*, *components/post-creation-form.tsx*, *components/rich-text-editor*.tsx*, *components/member-edit-form.tsx*,
 plus any additional files flagged by audit.

* Systematically replace banned classes with semantic tokens defined in *globals.css* (`bg-background`, `bg-muted`, `text-foreground`, etc.). Skeleton placeholders should use `bg-muted` with reduced opacity (e.g., `opacity-50`).
* Fallback to `dark:` variants only when semantic token not expressive enough.
* Run audit script until zero violations.
* Add unit snapshots for modified components ensuring class names include semantic tokens.

Phase 3 – Enforcement & visual verification
-------------------------------------------
Affected files: *.eslintrc*, *eslint-plugin/no-raw-colors.ts*, *playwright/theme-visual.spec.ts*

* Implement custom ESLint rule (can wrap script logic) and enable in config (error in CI).
* Add Playwright test: visit **/**, **/members/[id]**, **/post/[id]**; toggle `prefers-color-scheme` and assert body background != white in dark mode.
* Document CI step to run Playwright with `--update-snapshots` flag on demand.