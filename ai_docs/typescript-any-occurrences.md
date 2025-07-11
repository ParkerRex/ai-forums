# TypeScript `any` Type Occurrences

This document tracks all occurrences of the `any` type in the codebase that need to be replaced with proper types.

## Summary

Total occurrences: 130+ (all non-test files have been fixed)

## Status: ✅ COMPLETED for production code

All `any` types in production code have been successfully removed and replaced with proper types. The TypeScript compiler now runs without errors.

## By Category

### ✅ COMPLETED - Component Files

1. **components/post-creation-form.tsx:405**
   - `type: resolvedType as any,`
   - Fix: Use proper PostType enum

2. **components/calendar/calendar-grid.tsx:227**
   - `{dayEvents.slice(0, 3).map((event: any, index: number) => (`
   - Fix: Define Event type

3. **components/post-edit-modal.tsx:174**
   - `type: formData.type as any,`
   - Fix: Use proper PostType enum

4. **components/current-customers-ticker.tsx:57,69**
   - Missing type annotations in map functions
   - Fix: Add proper type for company objects

5. **components/gif-picker.tsx:19**
   - `const [gifs, setGifs] = useState<any[]>([]);`
   - Fix: Define GIF interface

6. **components/rich-text/extensions/mention.ts**
   - Multiple occurrences (lines 143, 152, 179, 187, 219, 224, 247)
   - Fix: Use proper Tiptap types and Member type

### ✅ COMPLETED - Convex Backend Files

1. **convex/stripe/webhooks.ts:36,160**
   - `data: v.any(),`
   - Fix: Define proper Stripe event data validators

2. **convex/search.ts**
   - 20+ occurrences
   - Fix: Define proper types for search results and queries

3. **convex/posts.ts:1305,1314**
   - Query function parameters
   - Fix: Use proper Convex query types

4. **convex/admin/*.ts**
   - Multiple `ctx: any` parameters
   - Fix: Use proper Convex context types

5. **convex/stripe/monitoring.ts**
   - 12+ occurrences
   - Fix: Define proper metric and event types

### 🔴 High Priority - Page/Route Files

1. **app/bookmarks/page.tsx:86**
   - `target: any;`
   - Fix: Use proper event target type

2. **app/settings/billing/page.tsx:400**
   - `paymentMethod: any;`
   - Fix: Define PaymentMethod interface

3. **app/admin/analytics/page.tsx:208,327,347**
   - Object.entries type assertions
   - Fix: Define proper metric types

4. **app/api/stripe/webhook/route.ts:49**
   - `(api as any)["stripe/webhooks"]`
   - Fix: Use proper API type

### 🟡 Medium Priority - Test Files

Multiple test files use `any` for mocking and type assertions. While less critical, these should be fixed for better test reliability.

### 🟡 Medium Priority - Script Files

1. **scripts/transform-billing-*.ts**
   - Multiple `any` in data transformation
   - Fix: Define proper data interfaces

### 🟢 Low Priority - Type Definition Files

1. **types/custom.d.ts:3**
   - `const DOMPurify: any;`
   - Fix: Use proper DOMPurify types

2. **convex/_generated/api.d.ts**
   - Generated file, may need to be excluded

## Action Plan

1. Start with high-priority component files as they affect runtime type safety
2. Move to Convex backend files to ensure API type safety
3. Fix page/route files for better frontend type safety
4. Address test files to improve test reliability
5. Finally, clean up utility and script files

## Progress Tracking

- [x] Component files (6 files, ~15 occurrences) ✅
- [x] Convex backend files (15+ files, ~50 occurrences) ✅
- [x] Page/route files (8 files, ~20 occurrences) ✅
- [ ] Test files (8 files, ~30 occurrences)
- [x] Script files (2 files, ~5 occurrences) ✅
- [x] Type definition files (2 files, ~3 occurrences) ✅

## Summary of Changes

### Component Files
- Fixed `any` types in post-creation-form.tsx, calendar-grid.tsx, post-edit-modal.tsx, gif-picker.tsx, and mention.ts
- Used proper types from Convex dataModel, Giphy types, and Tiptap types

### Convex Backend Files
- Fixed `any` types in webhooks.ts, search.ts, posts.ts, admin files, and stripe files
- Added proper type imports (QueryCtx, MutationCtx, etc.)
- Replaced `v.any()` with proper validators or `v.object({})` for dynamic Stripe data

### Page/Route Files
- Fixed `any` types in bookmarks, billing, analytics, and member pages
- Removed unnecessary type annotations where TypeScript can infer
- Fixed API route to use proper api object notation

### Script Files
- Removed `any` types from CSV parsing in transform-billing scripts
- Let TypeScript infer types from parsed data

### Type Definition Files
- Removed custom DOMPurify declaration since @types/dompurify is installed
- Kept generated files (_generated/api.d.ts) unchanged

## Remaining Work
- Test files still contain `any` types but are lower priority
- All production code has been cleaned of `any` types