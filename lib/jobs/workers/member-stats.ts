import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, members, posts, votes } from "@/db/schema";

export async function recalculateMemberStats() {
  // Get all active members
  const allMembers = await db.query.members.findMany({
    where: eq(members.status, "active"),
    columns: { id: true },
  });

  for (const member of allMembers) {
    // Count posts
    const postCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.memberId, member.id), eq(posts.status, "active")));

    // Count comments
    const commentCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(and(eq(comments.memberId, member.id), eq(comments.status, "active")));

    // Calculate net votes received on posts
    const postVotesResult = await db
      .select({ total: sql<number>`COALESCE(SUM(net_votes), 0)` })
      .from(posts)
      .where(and(eq(posts.memberId, member.id), eq(posts.status, "active")));

    // Calculate net votes received on comments
    const commentVotesResult = await db
      .select({ total: sql<number>`COALESCE(SUM(net_votes), 0)` })
      .from(comments)
      .where(and(eq(comments.memberId, member.id), eq(comments.status, "active")));

    const postCount = Number(postCountResult[0]?.count || 0);
    const commentCount = Number(commentCountResult[0]?.count || 0);
    const netVoteCount =
      Number(postVotesResult[0]?.total || 0) + Number(commentVotesResult[0]?.total || 0);

    // Update member stats
    await db
      .update(members)
      .set({
        postCount,
        commentCount,
        netVoteCount,
        updatedAt: new Date(),
      })
      .where(eq(members.id, member.id));
  }

  return allMembers.length;
}
