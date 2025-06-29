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
import type * as deduplication from "../deduplication.js";
import type * as importCommentsFixed from "../importCommentsFixed.js";
import type * as importData from "../importData.js";
import type * as importMembers from "../importMembers.js";
import type * as importPostsComments from "../importPostsComments.js";
import type * as members from "../members.js";
import type * as migration from "../migration.js";
import type * as migrations_add_member_fields from "../migrations/add_member_fields.js";
import type * as migrations_deduplicateComments from "../migrations/deduplicateComments.js";
import type * as posts from "../posts.js";
import type * as search from "../search.js";
import type * as stats from "../stats.js";
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
  deduplication: typeof deduplication;
  importCommentsFixed: typeof importCommentsFixed;
  importData: typeof importData;
  importMembers: typeof importMembers;
  importPostsComments: typeof importPostsComments;
  members: typeof members;
  migration: typeof migration;
  "migrations/add_member_fields": typeof migrations_add_member_fields;
  "migrations/deduplicateComments": typeof migrations_deduplicateComments;
  posts: typeof posts;
  search: typeof search;
  stats: typeof stats;
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
