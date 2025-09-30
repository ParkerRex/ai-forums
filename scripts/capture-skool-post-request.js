#!/usr/bin/env node

/**
 * SKOOL POST REQUEST CAPTURE TOOL
 *
 * This script helps capture the exact POST request structure that Skool uses
 * when creating a new post. Run this, login to Skool, create a post, and it
 * will save the request details for reverse engineering.
 *
 * Usage:
 *   node scripts/capture-skool-post-request.js
 *
 * What it does:
 * 1. Opens a browser
 * 2. Monitors network requests
 * 3. Waits for you to create a post manually
 * 4. Captures the POST request
 * 5. Saves it to a JSON file
 */

const puppeteer = require("puppeteer");
const fs = require("node:fs").promises;
const path = require("node:path");

const capturedRequests = [];

async function capturePostRequest() {
  console.log("🚀 Starting Skool Post Request Capture Tool\n");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();

  // Enable request interception
  await page.setRequestInterception(true);

  // Capture all POST requests to api.skool.com
  page.on("request", (request) => {
    const url = request.url();
    const method = request.method();

    // Log for debugging
    if (url.includes("api.skool.com")) {
      console.log(`📡 ${method} ${url}`);
    }

    // Capture POST requests to posts endpoint
    if (
      url.includes("api.skool.com") &&
      (method === "POST" || method === "PUT") &&
      (url.includes("/posts") || url.includes("/post"))
    ) {
      const requestData = {
        timestamp: new Date().toISOString(),
        url: url,
        method: method,
        headers: request.headers(),
        postData: request.postData(),
        postDataJSON: null,
      };

      // Try to parse JSON
      if (requestData.postData) {
        try {
          requestData.postDataJSON = JSON.parse(requestData.postData);
        } catch (_e) {
          console.log("⚠️  Post data is not JSON");
        }
      }

      capturedRequests.push(requestData);
      console.log("\n✅ CAPTURED POST REQUEST!");
      console.log("URL:", url);
      console.log("Method:", method);
      console.log("Headers:", JSON.stringify(request.headers(), null, 2));
      console.log("Body:", requestData.postData);
      console.log("\n");
    }

    // Continue the request
    request.continue();
  });

  // Navigate to Skool login
  console.log("📱 Opening Skool.com...\n");
  await page.goto("https://www.skool.com/login");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 INSTRUCTIONS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("1. Log into your Skool account");
  console.log("2. Navigate to your group");
  console.log("3. Create a new post (any content is fine)");
  console.log('4. Wait for "POST CAPTURED" message');
  console.log("5. Close the browser or press Ctrl+C");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Wait for user to close browser or interrupt
  try {
    await new Promise((resolve) => {
      process.on("SIGINT", resolve);

      // Also check every 5 seconds if browser is closed
      const checkInterval = setInterval(async () => {
        try {
          await browser.version();
        } catch (_e) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 5000);
    });
  } catch (_e) {
    // User closed browser or interrupted
  }

  // Save captured requests
  if (capturedRequests.length > 0) {
    const outputDir = path.join(__dirname, "..", "migration-data");
    const outputFile = path.join(outputDir, "skool-post-request-captured.json");

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(capturedRequests, null, 2));

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📁 Captured ${capturedRequests.length} request(s)`);
    console.log(`💾 Saved to: ${outputFile}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Print summary
    capturedRequests.forEach((req, i) => {
      console.log(`\n📝 Request ${i + 1}:`);
      console.log(`   URL: ${req.url}`);
      console.log(`   Method: ${req.method}`);
      if (req.postDataJSON) {
        console.log(
          `   Body Preview:`,
          `${JSON.stringify(req.postDataJSON, null, 4).slice(0, 200)}...`,
        );
      }
    });
  } else {
    console.log("\n⚠️  No POST requests captured. Make sure you created a post!");
  }

  try {
    await browser.close();
  } catch (_e) {
    // Browser already closed
  }
}

// Run
capturePostRequest()
  .then(() => {
    console.log("\n👋 Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Error:", err);
    process.exit(1);
  });
