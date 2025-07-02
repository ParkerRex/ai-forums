import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const createBugReport = action({
  args: {
    title: v.string(),
    stepsToReproduce: v.string(),
    expectedBehavior: v.string(),
    actualBehavior: v.string(),
    severity: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High"), v.literal("Critical")),
    browserInfo: v.string(),
    additionalContext: v.optional(v.string()),
    attachments: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args): Promise<{ issueNumber: number; issueUrl: string; success: boolean }> => {
    let memberInfo: { email: string; name: string } | undefined;
    
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity && identity.email) {
        const member = null;
        memberInfo = {
          email: identity.email,
          name: identity.name || "Anonymous User",
        };
      }
    } catch {
      memberInfo = undefined;
    }

    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      throw new Error('GitHub token not configured');
    }

    const GITHUB_API_URL = 'https://api.github.com';
    const OWNER = 'joinvai';
    const REPO = 'vai-vex';

    const issueBody = `## Bug Description
${args.title}

## Steps to Reproduce
${args.stepsToReproduce}

## Expected Behavior
${args.expectedBehavior}

## Actual Behavior
${args.actualBehavior}

## Environment
- Browser: ${args.browserInfo}
- Platform: VAI-VEX
${memberInfo ? `- Reported by: ${memberInfo.name} (${memberInfo.email})` : '- Reported by: Anonymous user'}

## Severity
${args.severity}

${args.additionalContext ? `## Additional Context
${args.additionalContext}` : ''}

---
*This bug report was submitted via the in-app bug reporting system.*`;

    const labels = ['bug', 'user submitted'];
    
    switch (args.severity.toLowerCase()) {
      case 'critical':
        labels.push('priority: critical');
        break;
      case 'high':
        labels.push('priority: high');
        break;
      case 'medium':
        labels.push('priority: medium');
        break;
      case 'low':
        labels.push('priority: low');
        break;
    }

    const response: Response = await fetch(
      `${GITHUB_API_URL}/repos/${OWNER}/${REPO}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `[Bug] ${args.title}`,
          body: issueBody,
          labels,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('GitHub API error:', errorData);
      throw new Error('Failed to create GitHub issue');
    }

    const issue = await response.json();

    return {
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      success: true,
    };
  },
});
