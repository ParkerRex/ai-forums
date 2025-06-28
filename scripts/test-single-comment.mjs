import { ConvexClient } from "convex/browser";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

// Read the post mapping
const postIdMapping = new Map(
  JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-data/post-id-mapping.json'), 'utf8'))
);

// Read comments
const commentBatches = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../migration-data/comment-batches.json'), 'utf8')
);

async function testSingleComment() {
  // Find a comment that failed - jasen-lew-8712@imported.com
  const failedComment = commentBatches.flat().find(c => c.authorEmail === 'jasen-lew-8712@imported.com');
  
  if (!failedComment) {
    console.log('Could not find the failed comment');
    return;
  }
  
  console.log('Testing comment:', failedComment);
  
  // Get the post ID
  const postId = postIdMapping.get(failedComment.postSkoolId);
  if (!postId) {
    console.log('Post not found for skoolId:', failedComment.postSkoolId);
    return;
  }
  
  try {
    // Clean the comment data
    const cleanComment = {
      content: failedComment.content,
      createdAt: failedComment.createdAt,
      updatedAt: failedComment.updatedAt,
      authorEmail: failedComment.authorEmail,
      postId: postId,
      parentCommentId: undefined,
      status: failedComment.status || "active",
      upvotes: failedComment.upvotes || 0,
      downvotes: failedComment.downvotes || 0,
      netVotes: failedComment.netVotes || 0,
      depth: failedComment.depth || 0,
      childCount: failedComment.childCount || 0,
      skoolId: failedComment.skoolId
    };
    
    console.log('Importing comment with data:', cleanComment);
    
    const result = await client.mutation("importCommentsFixed:importCommentFixed", cleanComment);
    console.log('Success!', result);
  } catch (error) {
    console.error('Failed:', error);
  }
  
  process.exit(0);
}

testSingleComment().catch(console.error);