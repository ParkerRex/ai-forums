#!/usr/bin/env node
import fs from "fs/promises";
import fetch from "node-fetch";

const GROUP_ID = "d712a2ce0a0d41c891c4949ab68373b2";
const SINCE = new Date("2025-06-21T00:00:00Z").getTime();

// ── plug your own tokens here ───────────────────────────────
const TOKENS = {
  auth_token: process.env.SKOOL_AUTH_TOKEN,
  client_id: process.env.SKOOL_CLIENT_ID,
  waf_token: process.env.SKOOL_WAF_TOKEN, // header:  x-aws-waf-token
};
// ────────────────────────────────────────────────────────────

function headers() {
  return {
    "content-type": "application/json",
    accept: "application/json, */*;q=0.9",
    "accept-language": "en-US,en;q=0.9",
    origin: "https://www.skool.com",
    referer: "https://www.skool.com/",
    "x-aws-waf-token": TOKENS.waf_token,
    cookie: `client_id=${TOKENS.client_id}; auth_token=${TOKENS.auth_token}`,
    "user-agent": "Mozilla/5.0",
  };
}

// Fetch one page of posts (newest first)
// Skool uses “cursor” for pagination — after=post.id
async function fetchPostsPage(cursor = "") {
  const url =
    `https://api.skool.com/posts?group-id=${GROUP_ID}&limit=50&pinned=true` +
    (cursor ? `&after=${cursor}` : "");
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { list: [posts], nextCursor }
}

async function fetchComments(postId) {
  const out = [];
  let cursor = "";
  while (true) {
    const url =
      `https://api.skool.com/posts/${postId}/comments?group-id=${GROUP_ID}&limit=50` +
      (cursor ? `&after=${cursor}` : "");
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) throw new Error(`c HTTP ${res.status}`);
    const json = await res.json(); // { list: [], nextCursor }
    out.push(...json.list);
    if (!json.nextCursor) break;
    cursor = json.nextCursor;
  }
  return out;
}

async function main() {
  console.log("🔗 Pulling posts & comments directly from api.skool.com …");
  const posts = [];
  const comments = [];

  let cursor = "";
  while (true) {
    const page = await fetchPostsPage(cursor);
    const fresh = page.list.filter((p) => p.createdAt >= SINCE);
    posts.push(...fresh);

    // stop when the next page would already be < SINCE
    if (!page.nextCursor || fresh.length < page.list.length) break;
    cursor = page.nextCursor;
  }
  console.log(`📝 Posts collected: ${posts.length}`);

  // Pull comments for each post (parallel but throttled 5 at a time)
  const batch = [];
  for (const post of posts) {
    batch.push(
      (async () => {
        const cs = await fetchComments(post.id);
        comments.push(...cs);
        process.stdout.write(`\r💬 comments: ${comments.length}`);
      })(),
    );
    if (batch.length >= 5) {
      await Promise.all(batch.splice(0));
    }
  }
  await Promise.all(batch); // flush last batch

  console.log(`\n✅ Done.  Comments collected: ${comments.length}`);

  // Save
  await fs.mkdir("migration-data", { recursive: true });
  const file = `migration-data/skool-since-2025-06-21.json`;
  await fs.writeFile(
    file,
    JSON.stringify({ extractedAt: new Date(), posts, comments }, null, 2),
  );
  console.log(`💾  Saved → ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
