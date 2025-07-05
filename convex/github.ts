import { v } from "convex/values";
import { action } from "./_generated/server";

export const createFeatureRequest = action({
  args: {
    title: v.string(),
    description: v.string(),
    screenshotUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ issueNumber: number; issueUrl: string; success: boolean }> => {
    const screenshotUrls = args.screenshotUrls || [];
    let identity: { email?: string; name?: string } | undefined;
    
    try {
      const userIdentity = await ctx.auth.getUserIdentity();
      identity = userIdentity || undefined;
    } catch {
      identity = undefined;
    }
    
    const memberInfo = identity?.email 
      ? `${identity.name || "Anonymous"} (${identity.email})` 
      : "Anonymous user";

    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      throw new Error('GitHub token not configured');
    }

    const GITHUB_API_URL = 'https://api.github.com';
    const OWNER = 'joinvai';
    const REPO = 'vai-vex';

    const issueBody = `## Feature Description
${args.description}

---
*Submitted by*: ${memberInfo}${
      screenshotUrls.length > 0 
        ? `\n\n## Screenshots\n${screenshotUrls.map((url, index) => {
            const urlParts = url.split('/');
            const filename = urlParts[urlParts.length - 1] || `Screenshot ${index + 1}`;
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
            const isImage = imageExtensions.some(ext => url.toLowerCase().includes(ext));
            
            if (isImage) {
              return `${index + 1}. ![${filename}](${url})`;
            } else {
              return `${index + 1}. [📎 ${filename}](${url})`;
            }
          }).join('\n')}` 
        : ''
    }

---
*This feature request was submitted via the in-app feature request system.*`;

    const labels = ['user submitted', 'feature request'];

    const response: Response = await fetch(
      `${GITHUB_API_URL}/repos/${OWNER}/${REPO}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `[Feature] ${args.title}`,
          body: issueBody,
          labels,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('GitHub API error:', errorData);
      
      let errorMessage = 'Failed to create GitHub issue';
      if (errorData.message) {
        errorMessage += `: ${errorData.message}`;
      }
      type GitHubErrorItem = { message?: string; code?: string };
      let errorDetails = '';
      if (Array.isArray(errorData.errors)) {
        errorDetails = (errorData.errors as GitHubErrorItem[])
          .map((e) => e.message || e.code)
          .join(', ');
      }
      if (errorDetails) {
        errorMessage += ` (${errorDetails})`;
      }
      
      throw new Error(errorMessage);
    }

    const issue = await response.json();

    return {
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      success: true,
    };
  },
});

export const createBugReport = action({
  args: {
    title: v.string(),
    stepsToReproduce: v.string(),
    expectedBehavior: v.string(),
    actualBehavior: v.string(),
    severity: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High"), v.literal("Critical")),
    browserInfo: v.string(),
    additionalContext: v.optional(v.string()),
    attachmentUrls: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ issueNumber: number; issueUrl: string; success: boolean }> => {
    // Default empty attachmentUrls array
    const attachmentUrls = args.attachmentUrls || [];
    let memberInfo: { email: string; name: string } | undefined;
    
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity && identity.email) {
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

${attachmentUrls.length > 0 ? `## Attachments
${attachmentUrls.map((url, index) => {
  // Extract filename from URL if possible
  const urlParts = url.split('/');
  const filename = urlParts[urlParts.length - 1] || `Attachment ${index + 1}`;
  
  // Check if it's an image based on common extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const isImage = imageExtensions.some(ext => url.toLowerCase().includes(ext));
  
  if (isImage) {
    return `${index + 1}. ![${filename}](${url})`;
  } else {
    // Use appropriate icon for documents
    const docExtensions = ['.doc', '.docx'];
    const pdfExtensions = ['.pdf'];
    let icon = '📎';
    
    if (docExtensions.some(ext => url.toLowerCase().includes(ext))) {
      icon = '📄';
    } else if (pdfExtensions.some(ext => url.toLowerCase().includes(ext))) {
      icon = '📑';
    }
    
    return `${index + 1}. [${icon} ${filename}](${url})`;
  }
}).join('\n')}` : ''}

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
          // GitHub REST API requires a valid PAT with repo/issue scopes.
          // Use the modern media type and explicit API version header per
          // https://docs.github.com/en/rest/issues/issues#create-an-issue
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
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
      
      // Expose detailed error information
      let errorMessage = 'Failed to create GitHub issue';
      if (errorData.message) {
        errorMessage += `: ${errorData.message}`;
      }
      type GitHubErrorItem = { message?: string; code?: string };
      let errorDetails = '';
      if (Array.isArray(errorData.errors)) {
        errorDetails = (errorData.errors as GitHubErrorItem[])
          .map((e) => e.message || e.code)
          .join(', ');
      }
      if (errorDetails) {
        errorMessage += ` (${errorDetails})`;
      }
      
      throw new Error(errorMessage);
    }

    const issue = await response.json();

    return {
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      success: true,
    };
  },
});
