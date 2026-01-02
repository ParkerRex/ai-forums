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

interface BugReportData {
  title: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  severity: string;
  browserInfo: string;
  additionalContext?: string;
  attachmentUrls?: string[];
}

export async function POST(request: Request) {
  try {
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
    }

    const data: BugReportData = await request.json();
    const { owner, repo } = getRepoConfig();

    const attachmentBlock =
      data.attachmentUrls && data.attachmentUrls.length > 0
        ? `\n## Attachments\n${data.attachmentUrls.map((url) => `- ${url}`).join("\n")}\n`
        : "";

    const issueBody = `## Bug Description
${data.title}

## Steps to Reproduce
${data.stepsToReproduce}

## Expected Behavior
${data.expectedBehavior}

## Actual Behavior
${data.actualBehavior}

## Environment
- Browser: ${data.browserInfo}
- Platform: VAI

## Severity
${data.severity}

${data.additionalContext ? `## Additional Context\n${data.additionalContext}\n` : ""}${attachmentBlock}
---
*Submitted via in-app bug report.*`;

    const labels = ["bug", "user submitted"];
    switch (data.severity.toLowerCase()) {
      case "critical":
        labels.push("priority: critical");
        break;
      case "high":
        labels.push("priority: high");
        break;
      case "medium":
        labels.push("priority: medium");
        break;
      case "low":
        labels.push("priority: low");
        break;
    }

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
        title: `[Bug] ${data.title}`,
        body: issueBody,
        labels,
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
    console.error("Error creating bug report:", error);
    return NextResponse.json({ error: "Failed to create bug report" }, { status: 500 });
  }
}
