/**
 * GitHub Webhooks - Handle GitHub events and post to Skool
 *
 * This module provides HTTP endpoints for GitHub webhooks to automatically
 * post releases and other events to Skool.
 *
 * Setup:
 * 1. Add environment variables for Skool auth
 * 2. Create webhook in GitHub repo settings:
 *    - Payload URL: https://your-app.convex.site/github/release
 *    - Content type: application/json
 *    - Events: Releases
 * 3. Optional: Add GITHUB_WEBHOOK_SECRET for verification
 */

import crypto from "node:crypto";
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * GitHub Release Webhook
 *
 * Triggered when a new release is published on GitHub
 */
http.route({
  path: "/github/release",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.text();
      const payload = JSON.parse(body);

      // Verify webhook signature if secret is configured
      const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
      if (webhookSecret) {
        const signature = req.headers.get("x-hub-signature-256");
        if (!signature || !verifyGitHubSignature(body, signature, webhookSecret)) {
          console.error("❌ Invalid GitHub webhook signature");
          return new Response("Unauthorized", { status: 401 });
        }
      }

      // Only process "published" releases
      if (payload.action !== "published") {
        console.log(`ℹ️  Ignoring GitHub release action: ${payload.action}`);
        return new Response("OK - action ignored", { status: 200 });
      }

      const release = payload.release;
      console.log(`📦 New GitHub release: ${release.name || release.tag_name}`);

      // Schedule Skool post
      await ctx.scheduler.runAfter(0, internal.skoolAutomation.postGitHubRelease, {
        name: release.name || release.tag_name,
        tagName: release.tag_name,
        body: release.body || "",
        htmlUrl: release.html_url,
        publishedAt: release.published_at,
        categoryId: process.env.SKOOL_CATEGORY_RELEASES, // Optional
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Release will be posted to Skool",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error processing GitHub webhook:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }),
});

/**
 * GitHub Star Webhook (Optional)
 *
 * Post to Skool when repo gets starred (milestone celebrations)
 */
http.route({
  path: "/github/star",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.text();
      const payload = JSON.parse(body);

      // Verify webhook signature if secret is configured
      const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
      if (webhookSecret) {
        const signature = req.headers.get("x-hub-signature-256");
        if (!signature || !verifyGitHubSignature(body, signature, webhookSecret)) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      // Only process "created" stars (not deleted)
      if (payload.action !== "created") {
        return new Response("OK - action ignored", { status: 200 });
      }

      const repo = payload.repository;
      const starCount = repo.stargazers_count;

      // Only post on milestone stars (100, 500, 1000, etc.)
      const milestones = [100, 500, 1000, 2000, 5000, 10000];
      if (!milestones.includes(starCount)) {
        return new Response("OK - not a milestone", { status: 200 });
      }

      console.log(`⭐ GitHub repo hit ${starCount} stars!`);

      // Post milestone to Skool
      await ctx.scheduler.runAfter(0, internal.skoolAutomation.postGitHubRelease, {
        name: `⭐ ${starCount} Stars Milestone!`,
        tagName: `${starCount}-stars`,
        body: `
We just hit **${starCount} stars** on GitHub! 🎉

Thank you to everyone who has supported the project!

[Star us on GitHub](${repo.html_url})
        `.trim(),
        htmlUrl: repo.html_url,
        publishedAt: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error processing GitHub star webhook:", error);
      return new Response(JSON.stringify({ success: false }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

/**
 * Health check endpoint
 */
http.route({
  path: "/github/health",
  method: "GET",
  handler: httpAction(async (_ctx, _req) => {
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }),
});

export default http;
