import { query } from "./_generated/server";

// Query to analyze data integrity issues
export const analyzeData = query({
  args: {},
  handler: async (ctx) => {
    console.log("Starting data integrity analysis...");

    // Get all posts
    const allPosts = await ctx.db.query("posts").collect();
    const postIds = new Set(allPosts.map((p) => p._id));

    // Get all members
    const allMembers = await ctx.db.query("members").collect();
    const memberIds = new Set(allMembers.map((m) => m._id));

    // Get all comments
    const allComments = await ctx.db.query("comments").collect();

    // Get all categories
    const allCategories = await ctx.db.query("categories").collect();
    const categoryIds = new Set(allCategories.map((c) => c._id));

    // 1. Posts without valid authors
    const postsWithoutAuthors = allPosts.filter(
      (post) => !post.memberId || !memberIds.has(post.memberId),
    );

    // 2. Members with placeholder emails
    const membersWithPlaceholderEmails = allMembers.filter(
      (member) =>
        member.email &&
        (member.email.includes("@imported.com") ||
          member.email.includes("@unknown.com") ||
          member.email.includes("@placeholder.com") ||
          member.email === "unknown@imported.com"),
    );

    // 3. Comments without valid posts
    const orphanedComments = allComments.filter(
      (comment) => !comment.postId || !postIds.has(comment.postId),
    );

    // 4. Comments without valid authors
    const commentsWithoutAuthors = allComments.filter(
      (comment) => !comment.memberId || !memberIds.has(comment.memberId),
    );

    // 5. Posts with invalid categories
    const postsWithInvalidCategories = allPosts.filter(
      (post) => !post.categoryId || !categoryIds.has(post.categoryId),
    );

    // 6. Members with missing required fields
    const membersWithMissingData = allMembers.filter(
      (member) => !member.firstName || !member.lastName || !member.email || !member.slug,
    );

    // 7. Posts with missing slugs
    const postsWithoutSlugs = allPosts.filter((post) => !post.slug);

    // 8. Analyze email domain patterns
    const emailDomains: Record<string, number> = {};
    membersWithPlaceholderEmails.forEach((member) => {
      const domain = member.email.split("@")[1];
      emailDomains[domain] = (emailDomains[domain] || 0) + 1;
    });

    // Return analysis results
    return {
      summary: {
        totalPosts: allPosts.length,
        totalComments: allComments.length,
        totalMembers: allMembers.length,
        totalCategories: allCategories.length,
      },
      issues: {
        postsWithoutAuthors: {
          count: postsWithoutAuthors.length,
          samples: postsWithoutAuthors.slice(0, 5).map((post) => ({
            id: post._id,
            title: post.title,
            createdAt: new Date(post.createdAt).toISOString(),
            memberId: post.memberId,
          })),
        },
        membersWithPlaceholderEmails: {
          count: membersWithPlaceholderEmails.length,
          domainBreakdown: emailDomains,
          samples: membersWithPlaceholderEmails.slice(0, 5).map((member) => ({
            id: member._id,
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            joinedDate: member.joinedDate ? new Date(member.joinedDate).toISOString() : "unknown",
          })),
        },
        orphanedComments: {
          count: orphanedComments.length,
          samples: orphanedComments.slice(0, 5).map((comment) => ({
            id: comment._id,
            postId: comment.postId,
            content: `${comment.content.substring(0, 100)}...`,
            createdAt: new Date(comment.createdAt).toISOString(),
          })),
        },
        commentsWithoutAuthors: {
          count: commentsWithoutAuthors.length,
          samples: commentsWithoutAuthors.slice(0, 5).map((comment) => ({
            id: comment._id,
            memberId: comment.memberId,
            content: `${comment.content.substring(0, 100)}...`,
            createdAt: new Date(comment.createdAt).toISOString(),
          })),
        },
        postsWithInvalidCategories: {
          count: postsWithInvalidCategories.length,
          samples: postsWithInvalidCategories.slice(0, 5).map((post) => ({
            id: post._id,
            title: post.title,
            categoryId: post.categoryId,
            createdAt: new Date(post.createdAt).toISOString(),
          })),
        },
        membersWithMissingData: {
          count: membersWithMissingData.length,
          samples: membersWithMissingData.slice(0, 5).map((member) => ({
            id: member._id,
            firstName: member.firstName || "[missing]",
            lastName: member.lastName || "[missing]",
            email: member.email || "[missing]",
            slug: member.slug || "[missing]",
          })),
        },
        postsWithoutSlugs: {
          count: postsWithoutSlugs.length,
          samples: postsWithoutSlugs.slice(0, 5).map((post) => ({
            id: post._id,
            title: post.title,
            slug: post.slug || "[missing]",
            createdAt: new Date(post.createdAt).toISOString(),
          })),
        },
      },
    };
  },
});

// Query to get detailed member analysis
export const analyzeMemberEmails = query({
  args: {},
  handler: async (ctx) => {
    const allMembers = await ctx.db.query("members").collect();

    // Group by email patterns
    const patterns: Record<string, { count: number; samples: any[] }> = {
      imported: { count: 0, samples: [] },
      valid: { count: 0, samples: [] },
      unknown: { count: 0, samples: [] },
      other_placeholder: { count: 0, samples: [] },
    };

    allMembers.forEach((member) => {
      const memberInfo = {
        id: member._id,
        name: `${member.firstName} ${member.lastName}`,
        email: member.email,
        postCount: member.postCount || 0,
        commentCount: member.commentCount || 0,
        joinedDate: member.joinedDate ? new Date(member.joinedDate).toISOString() : "unknown",
      };

      if (!member.email) {
        patterns.unknown.count++;
        if (patterns.unknown.samples.length < 10) {
          patterns.unknown.samples.push(memberInfo);
        }
      } else if (member.email.includes("@imported.com")) {
        patterns.imported.count++;
        if (patterns.imported.samples.length < 10) {
          patterns.imported.samples.push(memberInfo);
        }
      } else if (
        member.email.includes("@unknown.com") ||
        member.email.includes("@placeholder.com") ||
        member.email === "unknown@imported.com"
      ) {
        patterns.other_placeholder.count++;
        if (patterns.other_placeholder.samples.length < 10) {
          patterns.other_placeholder.samples.push(memberInfo);
        }
      } else {
        patterns.valid.count++;
        if (patterns.valid.samples.length < 10) {
          patterns.valid.samples.push(memberInfo);
        }
      }
    });

    return {
      totalMembers: allMembers.length,
      patterns,
    };
  },
});
