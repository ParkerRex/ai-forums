/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as categories from "../categories.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as deduplication from "../deduplication.js";
import type * as importPostsComments from "../importPostsComments.js";
import type * as linkPreview from "../linkPreview.js";
import type * as linkPreviews from "../linkPreviews.js";
import type * as members from "../members.js";
import type * as migration from "../migration.js";
import type * as migrations_add_member_fields from "../migrations/add_member_fields.js";
import type * as migrations_add_member_slug from "../migrations/add_member_slug.js";
import type * as migrations_add_post_media_fields from "../migrations/add_post_media_fields.js";
import type * as migrations_deduplicateComments from "../migrations/deduplicateComments.js";
import type * as migrations_fix_member_status from "../migrations/fix_member_status.js";
import type * as migrations_merge_duplicate_members from "../migrations/merge_duplicate_members.js";
import type * as migrations_merge_name_duplicates from "../migrations/merge_name_duplicates.js";
import type * as migrations_remove_imported_placeholders from "../migrations/remove_imported_placeholders.js";
import type * as postVersions from "../postVersions.js";
import type * as posts from "../posts.js";
import type * as search from "../search.js";
import type * as stats from "../stats.js";
import type * as storage from "../storage.js";
import type * as votes from "../votes.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  categories: typeof categories;
  comments: typeof comments;
  crons: typeof crons;
  deduplication: typeof deduplication;
  importPostsComments: typeof importPostsComments;
  linkPreview: typeof linkPreview;
  linkPreviews: typeof linkPreviews;
  members: typeof members;
  migration: typeof migration;
  "migrations/add_member_fields": typeof migrations_add_member_fields;
  "migrations/add_member_slug": typeof migrations_add_member_slug;
  "migrations/add_post_media_fields": typeof migrations_add_post_media_fields;
  "migrations/deduplicateComments": typeof migrations_deduplicateComments;
  "migrations/fix_member_status": typeof migrations_fix_member_status;
  "migrations/merge_duplicate_members": typeof migrations_merge_duplicate_members;
  "migrations/merge_name_duplicates": typeof migrations_merge_name_duplicates;
  "migrations/remove_imported_placeholders": typeof migrations_remove_imported_placeholders;
  postVersions: typeof postVersions;
  posts: typeof posts;
  search: typeof search;
  stats: typeof stats;
  storage: typeof storage;
  votes: typeof votes;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
