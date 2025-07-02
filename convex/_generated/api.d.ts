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
import type * as auth from "../auth.js";
import type * as bookmarks from "../bookmarks.js";
import type * as categories from "../categories.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as deduplication from "../deduplication.js";
import type * as linkPreview from "../linkPreview.js";
import type * as linkPreviews from "../linkPreviews.js";
import type * as members from "../members.js";
import type * as migrations_add_member_slug from "../migrations/add_member_slug.js";
import type * as migrations_add_post_media_fields from "../migrations/add_post_media_fields.js";
import type * as migrations_fix_member_status from "../migrations/fix_member_status.js";
import type * as notifications from "../notifications.js";
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
  auth: typeof auth;
  bookmarks: typeof bookmarks;
  categories: typeof categories;
  comments: typeof comments;
  crons: typeof crons;
  deduplication: typeof deduplication;
  linkPreview: typeof linkPreview;
  linkPreviews: typeof linkPreviews;
  members: typeof members;
  "migrations/add_member_slug": typeof migrations_add_member_slug;
  "migrations/add_post_media_fields": typeof migrations_add_post_media_fields;
  "migrations/fix_member_status": typeof migrations_fix_member_status;
  notifications: typeof notifications;
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
