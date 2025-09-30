#!/usr/bin/env bun

/**
 * SKOOL API DISCOVERY TOOL
 *
 * This Playwright script automatically captures ALL API requests made to Skool
 * when performing various actions. It helps us reverse-engineer the complete API.
 *
 * Actions captured:
 * - Creating posts
 * - Liking/unliking posts
 * - Commenting on posts
 * - DMing users
 * - Editing posts
 * - Deleting posts
 * - Following users
 * - Searching
 *
 * Usage:
 *   bun scripts/skool-api-discover.ts
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

interface CapturedRequest {
  timestamp: string;
  action: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  bodyJSON?: unknown;
  response?: {
    status: number;
    statusText: string;
    body?: string;
    bodyJSON?: unknown;
  };
}

const capturedRequests: CapturedRequest[] = [];
const outputDir = join(process.cwd(), "migration-data", "api-discovery");

/**
 * Wait for user input in terminal
 */
async function waitForUser(message: string): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`⏸️  ${message}`);
  console.log(`${"=".repeat(60)}`);
  console.log("Press ENTER to continue...");

  return new Promise((resolve) => {
    process.stdin.once("data", () => resolve());
  });
}

/**
 * Capture request and response
 */
async function captureRequest(action: string, page: Page): Promise<CapturedRequest[]> {
  const requests: CapturedRequest[] = [];

  // Listen for API requests
  const requestHandler = async (request: any) => {
    const url = request.url();

    // Only capture Skool API requests
    if (!url.includes("skool.com") && !url.includes("api.skool")) {
      return;
    }

    // Skip static assets
    if (
      url.includes(".js") ||
      url.includes(".css") ||
      url.includes(".png") ||
      url.includes(".jpg") ||
      url.includes(".svg")
    ) {
      return;
    }

    const captured: CapturedRequest = {
      timestamp: new Date().toISOString(),
      action,
      url,
      method: request.method(),
      headers: await request.allHeaders(),
      body: request.postData() || undefined,
      bodyJSON: undefined,
    };

    // Try to parse body as JSON
    if (captured.body) {
      try {
        captured.bodyJSON = JSON.parse(captured.body);
      } catch (_e) {
        // Not JSON
      }
    }

    // Wait for response
    try {
      const response = await request.response();
      if (response) {
        const responseBody = await response.text();
        captured.response = {
          status: response.status(),
          statusText: response.statusText(),
          body: responseBody,
          bodyJSON: undefined,
        };

        // Try to parse response as JSON
        if (responseBody) {
          try {
            captured.response.bodyJSON = JSON.parse(responseBody);
          } catch (_e) {
            // Not JSON
          }
        }
      }
    } catch (_e) {
      // Response not available
    }

    requests.push(captured);
    capturedRequests.push(captured);

    // Log interesting requests
    if (captured.method !== "GET" || url.includes("api.skool") || url.includes("graphql")) {
      console.log(`  📡 ${captured.method} ${url.substring(0, 80)}${url.length > 80 ? "..." : ""}`);
    }
  };

  page.on("request", requestHandler);

  return requests;
}

/**
 * Main discovery flow
 */
async function discoverAPI() {
  console.log("🚀 SKOOL API DISCOVERY TOOL\n");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100, // Slow down for better visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  console.log("📋 This tool will guide you through various Skool actions");
  console.log("   to capture the API requests needed for automation.\n");

  try {
    // Navigate to Skool
    console.log("🌐 Opening Skool.com...");
    await page.goto("https://www.skool.com/login");

    await waitForUser("Please login to Skool and navigate to your group.\nPress ENTER when ready.");

    // Action 1: Create a post
    console.log("\n📝 Action 1: CREATE POST");
    console.log("   Monitoring API requests...");
    await captureRequest("create_post", page);

    await waitForUser(
      'Create a NEW POST in your group.\nTitle: "API Discovery Test"\nContent: "Testing automated posting"\nPress ENTER after publishing.',
    );

    // Action 2: Like a post
    console.log("\n❤️  Action 2: LIKE POST");
    console.log("   Monitoring API requests...");
    await captureRequest("like_post", page);

    await waitForUser(
      "Click the LIKE button on a post (not your test post).\nPress ENTER after liking.",
    );

    // Action 3: Unlike a post
    console.log("\n💔 Action 3: UNLIKE POST");
    console.log("   Monitoring API requests...");
    await captureRequest("unlike_post", page);

    await waitForUser(
      "Click the LIKE button again to UNLIKE the post.\nPress ENTER after unliking.",
    );

    // Action 4: Comment on post
    console.log("\n💬 Action 4: CREATE COMMENT");
    console.log("   Monitoring API requests...");
    await captureRequest("create_comment", page);

    await waitForUser(
      'Add a COMMENT to a post.\nComment: "Testing automated commenting"\nPress ENTER after posting comment.',
    );

    // Action 5: Reply to comment
    console.log("\n↩️  Action 5: REPLY TO COMMENT");
    console.log("   Monitoring API requests...");
    await captureRequest("reply_comment", page);

    await waitForUser(
      'REPLY to an existing comment.\nReply: "Testing reply automation"\nPress ENTER after posting reply.',
    );

    // Action 6: Edit post
    console.log("\n✏️  Action 6: EDIT POST");
    console.log("   Monitoring API requests...");
    await captureRequest("edit_post", page);

    await waitForUser(
      'EDIT your "API Discovery Test" post.\nAdd: " - EDITED"\nPress ENTER after saving edit.',
    );

    // Action 7: Delete post
    console.log("\n🗑️  Action 7: DELETE POST");
    console.log("   Monitoring API requests...");
    await captureRequest("delete_post", page);

    await waitForUser(
      'DELETE your "API Discovery Test" post.\nPress ENTER after confirming deletion.',
    );

    // Action 8: Send DM
    console.log("\n📨 Action 8: SEND DIRECT MESSAGE");
    console.log("   Monitoring API requests...");
    await captureRequest("send_dm", page);

    await waitForUser(
      'Open DMs and send a message to someone.\nMessage: "Testing DM automation (ignore this)"\nPress ENTER after sending.',
    );

    // Action 9: Follow user
    console.log("\n👤 Action 9: FOLLOW USER");
    console.log("   Monitoring API requests...");
    await captureRequest("follow_user", page);

    await waitForUser(
      "Navigate to a user's profile and FOLLOW them.\nPress ENTER after following.",
    );

    // Action 10: Unfollow user
    console.log("\n👋 Action 10: UNFOLLOW USER");
    console.log("   Monitoring API requests...");
    await captureRequest("unfollow_user", page);

    await waitForUser("UNFOLLOW the user you just followed.\nPress ENTER after unfollowing.");

    // Action 11: Search
    console.log("\n🔍 Action 11: SEARCH");
    console.log("   Monitoring API requests...");
    await captureRequest("search", page);

    await waitForUser(
      'Use the SEARCH function to search for "test".\nPress ENTER after seeing results.',
    );

    // Action 12: Get notifications
    console.log("\n🔔 Action 12: GET NOTIFICATIONS");
    console.log("   Monitoring API requests...");
    await captureRequest("get_notifications", page);

    await waitForUser(
      "Click the NOTIFICATIONS bell icon.\nPress ENTER after opening notifications.",
    );

    // Save all captured requests
    console.log("\n💾 Saving captured API requests...");

    await mkdir(outputDir, { recursive: true });

    // Save complete dataset
    const allRequestsPath = join(outputDir, "all-requests.json");
    await writeFile(allRequestsPath, JSON.stringify(capturedRequests, null, 2));
    console.log(`✅ Saved all requests: ${allRequestsPath}`);

    // Save by action
    const actionGroups: Record<string, CapturedRequest[]> = {};
    for (const req of capturedRequests) {
      if (!actionGroups[req.action]) {
        actionGroups[req.action] = [];
      }
      actionGroups[req.action].push(req);
    }

    for (const [action, requests] of Object.entries(actionGroups)) {
      const actionPath = join(outputDir, `${action}.json`);
      await writeFile(actionPath, JSON.stringify(requests, null, 2));
      console.log(`✅ Saved ${requests.length} requests for ${action}: ${actionPath}`);
    }

    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalRequests: capturedRequests.length,
      actionsSummary: Object.entries(actionGroups).map(([action, reqs]) => ({
        action,
        requestCount: reqs.length,
        methods: [...new Set(reqs.map((r) => r.method))],
        endpoints: [...new Set(reqs.map((r) => r.url))],
      })),
    };

    const summaryPath = join(outputDir, "summary.json");
    await writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Saved summary: ${summaryPath}`);

    // Generate TypeScript types
    console.log("\n🔧 Generating TypeScript API client...");
    await generateAPIClient(actionGroups);

    console.log(`\n${"=".repeat(60)}`);
    console.log("🎉 API DISCOVERY COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Total requests captured: ${capturedRequests.length}`);
    console.log(`   Actions discovered: ${Object.keys(actionGroups).length}`);
    console.log(`\n📁 Output directory: ${outputDir}`);
    console.log(`\n🔍 Files created:`);
    console.log(`   - all-requests.json (complete dataset)`);
    console.log(`   - summary.json (quick overview)`);
    console.log(`   - {action}.json (per-action requests)`);
    console.log(`   - skool-api-client.ts (generated API client)`);
    console.log(`\n💡 Next: Review the captured requests and implement in lib/skool-poster.ts`);
  } catch (error) {
    console.error("❌ Error during discovery:", error);
  } finally {
    console.log("\n👋 Press ENTER to close browser and exit...");
    await new Promise((resolve) => process.stdin.once("data", resolve));
    await browser.close();
  }
}

/**
 * Generate TypeScript API client from captured requests
 */
async function generateAPIClient(actionGroups: Record<string, CapturedRequest[]>) {
  const endpoints: Array<{
    action: string;
    method: string;
    url: string;
    body?: unknown;
    response?: unknown;
  }> = [];

  // Extract unique endpoints
  for (const [action, requests] of Object.entries(actionGroups)) {
    for (const req of requests) {
      // Only include POST/PUT/DELETE requests (mutations)
      if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
        endpoints.push({
          action,
          method: req.method,
          url: req.url,
          body: req.bodyJSON,
          response: req.response?.bodyJSON,
        });
      }
    }
  }

  const clientCode = `/**
 * SKOOL API CLIENT
 *
 * Auto-generated from API discovery on ${new Date().toISOString()}
 *
 * This file contains TypeScript types and functions for all discovered
 * Skool API endpoints. Use this as a reference when implementing automation.
 */

export interface SkoolAPIConfig {
  groupId: string;
  groupName: string;
  authToken: string;
  clientId: string;
  wafToken: string;
}

/**
 * Get headers for Skool API requests
 */
function getHeaders(config: SkoolAPIConfig): Record<string, string> {
  return {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json',
    'cookie': \`client_id=\${config.clientId}; auth_token=\${config.authToken}\`,
    'origin': 'https://www.skool.com',
    'referer': \`https://www.skool.com/\${config.groupName}\`,
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'x-aws-waf-token': config.wafToken,
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
  };
}

${endpoints
  .map((ep, _i) => {
    const funcName = ep.action.replace(/_/g, "");
    const bodyType = ep.body ? `\n  body: ${JSON.stringify(ep.body, null, 2)},` : "";
    const comment = `/**
 * ${ep.action.toUpperCase()}
 * ${ep.method} ${ep.url}
 *
 * Discovered endpoint - implement with actual types
 */`;

    return `${comment}
export async function ${funcName}(
  config: SkoolAPIConfig,
  data: any // TODO: Add specific types from captured requests
): Promise<any> {
  const response = await fetch('${ep.url}', {
    method: '${ep.method}',
    headers: getHeaders(config),${bodyType}
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(\`${ep.action} failed: \${response.status} \${response.statusText}\`);
  }

  return response.json();
}`;
  })
  .join("\n\n")}

/**
 * TODO: Review migration-data/api-discovery/*.json files
 * and add proper TypeScript types for each endpoint
 */
`;

  const clientPath = join(outputDir, "skool-api-client.ts");
  await writeFile(clientPath, clientCode);
  console.log(`✅ Generated API client: ${clientPath}`);
}

// Run the discovery
discoverAPI().catch(console.error);
