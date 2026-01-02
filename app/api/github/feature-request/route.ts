import { NextResponse } from "next/server";

const GITHUB_API_URL = "https://api.github.com";

function getRepoConfig() {
  const repoSlug = process.env.GITHUB_REPO?.trim();
  const [repoOwner, repoName] = repoSlug ? repoSlug.split("/") : [];

  return {
    owner: process.env.GITHUB_OWNER?.trim() || repoOwner || "ParkerRex",
    repo: process.env.GITHUB_REPO_NAME?.trim() || repoName || "ai-forums",
  };
}

interface FeatureRequestData {
  title: string;
  description: string;
  screenshotUrls?: string[];
}

export async function POST(request: Request) {
  try {
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

    const data: FeatureRequestData = await request.json();
    const { owner, repo } = getRepoConfig();

    const screenshotBlock =
      data.screenshotUrls && data.screenshotUrls.length > 0
        ? `\n## Screenshots\n${data.screenshotUrls.map((url) => `- ${url}`).join("\n")}\n`
        : "";

    const issueBody = `## Feature Request
${data.description}
${screenshotBlock}
---
*Submitted via in-app feature request.*`;

    const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "vai-forums",
      },
      body: JSON.stringify({
        title: `[Feature] ${data.title}`,
        body: issueBody,
        labels: ["feature request", "user submitted"],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("GitHub API error:", errorData);
      return NextResponse.json(
        { error: "Failed to create GitHub issue" },
        { status: response.status },
      );
    }

    const issue = await response.json();
    return NextResponse.json({
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      success: true,
    });
  } catch (error) {
    console.error("Error creating feature request:", error);
    return NextResponse.json({ error: "Failed to create feature request" }, { status: 500 });
  }
}
