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
import type * as admin_grantScholarship from "../admin/grantScholarship.js";
import type * as admin_members from "../admin/members.js";
import type * as admin_metrics from "../admin/metrics.js";
import type * as admin_payments from "../admin/payments.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as bookmarks from "../bookmarks.js";
import type * as categories from "../categories.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as deduplication from "../deduplication.js";
import type * as events from "../events.js";
import type * as github from "../github.js";
import type * as helpers_access from "../helpers/access.js";
import type * as linkPreview from "../linkPreview.js";
import type * as linkPreviews from "../linkPreviews.js";
import type * as members from "../members.js";
import type * as migrations_add_member_slug from "../migrations/add_member_slug.js";
import type * as migrations_add_missing_members_20250709 from "../migrations/add_missing_members_20250709.js";
import type * as migrations_add_post_media_fields from "../migrations/add_post_media_fields.js";
import type * as migrations_analyzeMembershipCounts from "../migrations/analyzeMembershipCounts.js";
import type * as migrations_checkSubscriptionStatuses from "../migrations/checkSubscriptionStatuses.js";
import type * as migrations_checkUnmatchedMembers from "../migrations/checkUnmatchedMembers.js";
import type * as migrations_fix_member_status from "../migrations/fix_member_status.js";
import type * as migrations_importMemberBilling from "../migrations/importMemberBilling.js";
import type * as migrations_migrate_post_attachments from "../migrations/migrate_post_attachments.js";
import type * as migrations_populatePaymentFields from "../migrations/populatePaymentFields.js";
import type * as migrations_verifyImport from "../migrations/verifyImport.js";
import type * as news from "../news.js";
import type * as newsFeed from "../newsFeed.js";
import type * as notifications from "../notifications.js";
import type * as polls from "../polls.js";
import type * as postVersions from "../postVersions.js";
import type * as posts from "../posts.js";
import type * as resources from "../resources.js";
import type * as search from "../search.js";
import type * as stats from "../stats.js";
import type * as storage from "../storage.js";
import type * as stripe_checkout from "../stripe/checkout.js";
import type * as stripe_getSubscriptionInfo from "../stripe/getSubscriptionInfo.js";
import type * as stripe_monitoring from "../stripe/monitoring.js";
import type * as stripe_portal from "../stripe/portal.js";
import type * as stripe_refund from "../stripe/refund.js";
import type * as stripe_renewalReminders from "../stripe/renewalReminders.js";
import type * as stripe_webhooks from "../stripe/webhooks.js";
import type * as topics from "../topics.js";
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
  "admin/grantScholarship": typeof admin_grantScholarship;
  "admin/members": typeof admin_members;
  "admin/metrics": typeof admin_metrics;
  "admin/payments": typeof admin_payments;
  admin: typeof admin;
  auth: typeof auth;
  bookmarks: typeof bookmarks;
  categories: typeof categories;
  comments: typeof comments;
  crons: typeof crons;
  deduplication: typeof deduplication;
  events: typeof events;
  github: typeof github;
  "helpers/access": typeof helpers_access;
  linkPreview: typeof linkPreview;
  linkPreviews: typeof linkPreviews;
  members: typeof members;
  "migrations/add_member_slug": typeof migrations_add_member_slug;
  "migrations/add_missing_members_20250709": typeof migrations_add_missing_members_20250709;
  "migrations/add_post_media_fields": typeof migrations_add_post_media_fields;
  "migrations/analyzeMembershipCounts": typeof migrations_analyzeMembershipCounts;
  "migrations/checkSubscriptionStatuses": typeof migrations_checkSubscriptionStatuses;
  "migrations/checkUnmatchedMembers": typeof migrations_checkUnmatchedMembers;
  "migrations/fix_member_status": typeof migrations_fix_member_status;
  "migrations/importMemberBilling": typeof migrations_importMemberBilling;
  "migrations/migrate_post_attachments": typeof migrations_migrate_post_attachments;
  "migrations/populatePaymentFields": typeof migrations_populatePaymentFields;
  "migrations/verifyImport": typeof migrations_verifyImport;
  news: typeof news;
  newsFeed: typeof newsFeed;
  notifications: typeof notifications;
  polls: typeof polls;
  postVersions: typeof postVersions;
  posts: typeof posts;
  resources: typeof resources;
  search: typeof search;
  stats: typeof stats;
  storage: typeof storage;
  "stripe/checkout": typeof stripe_checkout;
  "stripe/getSubscriptionInfo": typeof stripe_getSubscriptionInfo;
  "stripe/monitoring": typeof stripe_monitoring;
  "stripe/portal": typeof stripe_portal;
  "stripe/refund": typeof stripe_refund;
  "stripe/renewalReminders": typeof stripe_renewalReminders;
  "stripe/webhooks": typeof stripe_webhooks;
  topics: typeof topics;
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
