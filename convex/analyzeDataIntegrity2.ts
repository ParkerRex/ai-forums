import { query } from "./_generated/server";

// Query to find specific invalid member references
export const findInvalidMemberReferences = query({
  args: {},
  handler: async (ctx) => {
    // Get all valid member IDs
    const allMembers = await ctx.db.query("members").collect();
    const validMemberIds = new Set(allMembers.map((m) => m._id));

    // Check posts for invalid member IDs
    const allPosts = await ctx.db.query("posts").collect();
    const postsWithInvalidMembers = allPosts.filter(
      (post) => post.memberId && !validMemberIds.has(post.memberId),
    );

    // Check comments for invalid member IDs
    const allComments = await ctx.db.query("comments").collect();
    const commentsWithInvalidMembers = allComments.filter(
      (comment) => comment.memberId && !validMemberIds.has(comment.memberId),
    );

    // Group invalid member IDs by frequency
    const invalidMemberCounts: Record<string, { posts: number; comments: number }> = {};

    postsWithInvalidMembers.forEach((post) => {
      if (!invalidMemberCounts[post.memberId]) {
        invalidMemberCounts[post.memberId] = { posts: 0, comments: 0 };
      }
      invalidMemberCounts[post.memberId].posts++;
    });

    commentsWithInvalidMembers.forEach((comment) => {
      if (!invalidMemberCounts[comment.memberId]) {
        invalidMemberCounts[comment.memberId] = { posts: 0, comments: 0 };
      }
      invalidMemberCounts[comment.memberId].comments++;
    });

    // Try to find these member IDs in the database
    const invalidMemberDetails = await Promise.all(
      Object.keys(invalidMemberCounts).map(async (memberId) => {
        try {
          const member = await ctx.db.get(memberId as any);
          return {
            memberId,
            exists: !!member,
            memberData: member,
            postCount: invalidMemberCounts[memberId].posts,
            commentCount: invalidMemberCounts[memberId].comments,
          };
        } catch (_e) {
          return {
            memberId,
            exists: false,
            memberData: null,
            postCount: invalidMemberCounts[memberId].posts,
            commentCount: invalidMemberCounts[memberId].comments,
          };
        }
      }),
    );

    return {
      summary: {
        postsWithInvalidMembers: postsWithInvalidMembers.length,
        commentsWithInvalidMembers: commentsWithInvalidMembers.length,
        uniqueInvalidMemberIds: Object.keys(invalidMemberCounts).length,
      },
      invalidMemberDetails,
      samplePostsWithInvalidMembers: postsWithInvalidMembers.slice(0, 5).map((post) => ({
        postId: post._id,
        title: post.title,
        memberId: post.memberId,
        createdAt: new Date(post.createdAt).toISOString(),
      })),
      sampleCommentsWithInvalidMembers: commentsWithInvalidMembers.slice(0, 5).map((comment) => ({
        commentId: comment._id,
        content: `${comment.content.substring(0, 100)}...`,
        memberId: comment.memberId,
        postId: comment.postId,
        createdAt: new Date(comment.createdAt).toISOString(),
      })),
    };
  },
});

// Query to analyze members with placeholder emails and their activity
export const analyzePlaceholderMembers = query({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db
      .query("members")
      .filter((q) =>
        q.or(
          q.eq(q.field("email"), "sin-adain-2623@imported.com"),
          q.eq(q.field("email"), "john-victory-9400@imported.com"),
          q.eq(q.field("email"), "malvinder-singh-6682@imported.com"),
        ),
      )
      .collect();

    const memberDetails = await Promise.all(
      members.map(async (member) => {
        // Get their posts
        const posts = await ctx.db
          .query("posts")
          .filter((q) => q.eq(q.field("memberId"), member._id))
          .collect();

        // Get their comments
        const comments = await ctx.db
          .query("comments")
          .filter((q) => q.eq(q.field("memberId"), member._id))
          .collect();

        return {
          member: {
            id: member._id,
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            joinedDate: member.joinedDate ? new Date(member.joinedDate).toISOString() : "unknown",
            status: member.status,
            externalId: member.externalId,
          },
          activity: {
            postCount: posts.length,
            commentCount: comments.length,
            samplePosts: posts.slice(0, 3).map((post) => ({
              id: post._id,
              title: post.title,
              createdAt: new Date(post.createdAt).toISOString(),
            })),
            sampleComments: comments.slice(0, 3).map((comment) => ({
              id: comment._id,
              content: `${comment.content.substring(0, 100)}...`,
              postId: comment.postId,
              createdAt: new Date(comment.createdAt).toISOString(),
            })),
          },
        };
      }),
    );

    return memberDetails;
  },
});
