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
import type * as admin_manualWebhookProcessing from "../admin/manualWebhookProcessing.js";
import type * as admin_members from "../admin/members.js";
import type * as admin_metrics from "../admin/metrics.js";
import type * as admin_payments from "../admin/payments.js";
import type * as admin_webhookDiagnostics from "../admin/webhookDiagnostics.js";
import type * as admin from "../admin.js";
import type * as auth_cleanupExpiredTokens from "../auth/cleanupExpiredTokens.js";
import type * as auth_clerkAccounts from "../auth/clerkAccounts.js";
import type * as auth from "../auth.js";
import type * as bookmarks from "../bookmarks.js";
import type * as categories from "../categories.js";
import type * as comments from "../comments.js";
import type * as countryDetection from "../countryDetection.js";
import type * as crons_cleanupTokens from "../crons/cleanupTokens.js";
import type * as crons_generateMissingPreviews from "../crons/generateMissingPreviews.js";
import type * as crons from "../crons.js";
import type * as deduplication from "../deduplication.js";
import type * as discord from "../discord.js";
import type * as events from "../events.js";
import type * as github from "../github.js";
import type * as helpers_access from "../helpers/access.js";
import type * as helpers_subscriptionAccess from "../helpers/subscriptionAccess.js";
import type * as linkPreview from "../linkPreview.js";
import type * as linkPreviews from "../linkPreviews.js";
import type * as locationHelpers from "../locationHelpers.js";
import type * as members_checkoutStatus from "../members/checkoutStatus.js";
import type * as members from "../members.js";
import type * as migrations_add_github_style_comment_fields from "../migrations/add_github_style_comment_fields.js";
import type * as migrations_add_member_slug from "../migrations/add_member_slug.js";
import type * as migrations_add_missing_members_20250709 from "../migrations/add_missing_members_20250709.js";
import type * as migrations_add_post_media_fields from "../migrations/add_post_media_fields.js";
import type * as migrations_add_preview_field from "../migrations/add_preview_field.js";
import type * as migrations_analyzeMembershipCounts from "../migrations/analyzeMembershipCounts.js";
import type * as migrations_checkSubscriptionStatuses from "../migrations/checkSubscriptionStatuses.js";
import type * as migrations_checkUnmatchedMembers from "../migrations/checkUnmatchedMembers.js";
import type * as migrations_create_clerk_account_for_email from "../migrations/create_clerk_account_for_email.js";
import type * as migrations_create_clerk_accounts_for_legacy_members from "../migrations/create_clerk_accounts_for_legacy_members.js";
import type * as migrations_fix_member_status from "../migrations/fix_member_status.js";
import type * as migrations_importMemberBilling from "../migrations/importMemberBilling.js";
import type * as migrations_linkGuestAccounts from "../migrations/linkGuestAccounts.js";
import type * as migrations_migrate_post_attachments from "../migrations/migrate_post_attachments.js";
import type * as migrations_populatePaymentFields from "../migrations/populatePaymentFields.js";
import type * as migrations_removeLegacyTiers from "../migrations/removeLegacyTiers.js";
import type * as migrations_removePendingOnboardingStatus from "../migrations/removePendingOnboardingStatus.js";
import type * as migrations_testReactivation from "../migrations/testReactivation.js";
import type * as migrations_verifyImport from "../migrations/verifyImport.js";
import type * as news from "../news.js";
import type * as newsFeed from "../newsFeed.js";
import type * as notifications from "../notifications.js";
import type * as polls from "../polls.js";
import type * as postVersions from "../postVersions.js";
import type * as posts from "../posts.js";
import type * as previewGeneration from "../previewGeneration.js";
import type * as resources from "../resources.js";
import type * as search from "../search.js";
import type * as stats from "../stats.js";
import type * as storage from "../storage.js";
import type * as stripe_checkout from "../stripe/checkout.js";
import type * as stripe_directCheckout from "../stripe/directCheckout.js";
import type * as stripe_getSubscriptionInfo from "../stripe/getSubscriptionInfo.js";
import type * as stripe_monitoring from "../stripe/monitoring.js";
import type * as stripe_portal from "../stripe/portal.js";
import type * as stripe_pricing from "../stripe/pricing.js";
import type * as stripe_refund from "../stripe/refund.js";
import type * as stripe_renewalReminders from "../stripe/renewalReminders.js";
import type * as stripe_retryFailedPayment from "../stripe/retryFailedPayment.js";
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
  "admin/manualWebhookProcessing": typeof admin_manualWebhookProcessing;
  "admin/members": typeof admin_members;
  "admin/metrics": typeof admin_metrics;
  "admin/payments": typeof admin_payments;
  "admin/webhookDiagnostics": typeof admin_webhookDiagnostics;
  admin: typeof admin;
  "auth/cleanupExpiredTokens": typeof auth_cleanupExpiredTokens;
  "auth/clerkAccounts": typeof auth_clerkAccounts;
  auth: typeof auth;
  bookmarks: typeof bookmarks;
  categories: typeof categories;
  comments: typeof comments;
  countryDetection: typeof countryDetection;
  "crons/cleanupTokens": typeof crons_cleanupTokens;
  "crons/generateMissingPreviews": typeof crons_generateMissingPreviews;
  crons: typeof crons;
  deduplication: typeof deduplication;
  discord: typeof discord;
  events: typeof events;
  github: typeof github;
  "helpers/access": typeof helpers_access;
  "helpers/subscriptionAccess": typeof helpers_subscriptionAccess;
  linkPreview: typeof linkPreview;
  linkPreviews: typeof linkPreviews;
  locationHelpers: typeof locationHelpers;
  "members/checkoutStatus": typeof members_checkoutStatus;
  members: typeof members;
  "migrations/add_github_style_comment_fields": typeof migrations_add_github_style_comment_fields;
  "migrations/add_member_slug": typeof migrations_add_member_slug;
  "migrations/add_missing_members_20250709": typeof migrations_add_missing_members_20250709;
  "migrations/add_post_media_fields": typeof migrations_add_post_media_fields;
  "migrations/add_preview_field": typeof migrations_add_preview_field;
  "migrations/analyzeMembershipCounts": typeof migrations_analyzeMembershipCounts;
  "migrations/checkSubscriptionStatuses": typeof migrations_checkSubscriptionStatuses;
  "migrations/checkUnmatchedMembers": typeof migrations_checkUnmatchedMembers;
  "migrations/create_clerk_account_for_email": typeof migrations_create_clerk_account_for_email;
  "migrations/create_clerk_accounts_for_legacy_members": typeof migrations_create_clerk_accounts_for_legacy_members;
  "migrations/fix_member_status": typeof migrations_fix_member_status;
  "migrations/importMemberBilling": typeof migrations_importMemberBilling;
  "migrations/linkGuestAccounts": typeof migrations_linkGuestAccounts;
  "migrations/migrate_post_attachments": typeof migrations_migrate_post_attachments;
  "migrations/populatePaymentFields": typeof migrations_populatePaymentFields;
  "migrations/removeLegacyTiers": typeof migrations_removeLegacyTiers;
  "migrations/removePendingOnboardingStatus": typeof migrations_removePendingOnboardingStatus;
  "migrations/testReactivation": typeof migrations_testReactivation;
  "migrations/verifyImport": typeof migrations_verifyImport;
  news: typeof news;
  newsFeed: typeof newsFeed;
  notifications: typeof notifications;
  polls: typeof polls;
  postVersions: typeof postVersions;
  posts: typeof posts;
  previewGeneration: typeof previewGeneration;
  resources: typeof resources;
  search: typeof search;
  stats: typeof stats;
  storage: typeof storage;
  "stripe/checkout": typeof stripe_checkout;
  "stripe/directCheckout": typeof stripe_directCheckout;
  "stripe/getSubscriptionInfo": typeof stripe_getSubscriptionInfo;
  "stripe/monitoring": typeof stripe_monitoring;
  "stripe/portal": typeof stripe_portal;
  "stripe/pricing": typeof stripe_pricing;
  "stripe/refund": typeof stripe_refund;
  "stripe/renewalReminders": typeof stripe_renewalReminders;
  "stripe/retryFailedPayment": typeof stripe_retryFailedPayment;
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
