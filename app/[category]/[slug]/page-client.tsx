"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import PostDetail from "@/components/post-detail";
import { MembershipCTAModal } from "@/components/membership-cta-modal";
import { Button } from "@/components/ui/button";
import { Lock, Eye, MessageSquare } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import CommentSection from "@/components/comment-section";
import { use } from "react";
import { notFound, useSearchParams } from "next/navigation";

interface PostPageClientProps {
  params: Promise<{
    category: string;
    slug: string;
  }>;
}

export default function PostPageClient({ params }: PostPageClientProps) {
  // Unwrap the params promise (Next.js 15 behavior)
  const resolvedParams = use(params);
  const { category, slug } = resolvedParams;
  const searchParams = useSearchParams();
  const commentId = searchParams.get('commentId');
  
  // Check if we have valid parameters
  const hasValidParams = category && slug && 
    typeof category === "string" && category.trim() !== "" &&
    typeof slug === "string" && slug.trim() !== "";
  
  // Query for the post by slug
  const post = useQuery(api.posts.getPostBySlug, hasValidParams ? { slug } : "skip");

  console.log("PostPageClient - category:", category, "slug:", slug, "hasValidParams:", hasValidParams);

  if (!hasValidParams) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Invalid URL</h1>
          <p className="text-muted-foreground">The URL format is invalid.</p>
        </div>
      </div>
    );
  }

  if (post === undefined) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-4"></div>
          <div className="h-4 bg-muted rounded mb-2"></div>
          <div className="h-4 bg-muted rounded mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // If post not found or category doesn't match, show 404
  if (post === null || post.category?.name !== category) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Authenticated>
        <PostDetail post={post} />
        <div className="mt-8">
          <CommentSection postId={post._id as Id<"posts">} targetCommentId={commentId ?? undefined} />
        </div>
      </Authenticated>

      <Unauthenticated>
        {/* Show preview for unauthenticated users */}
        <div className="space-y-6">
          {/* Post Header */}
          <div className="border-b pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {post.category?.displayName || "General"}
                </span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">{post.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>by {post.author?.firstName} {post.author?.lastName}</span>
              <span>•</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>{post.upvotes} upvotes</span>
            </div>
          </div>

          {/* Preview Content */}
          <div className="prose prose-lg max-w-none">
            <div className="text-muted-foreground leading-relaxed">
              {/* Show first 200 characters */}
              {post.content?.substring(0, 200)}...
            </div>
          </div>

          {/* Membership CTA */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Join to Read Full Post
            </h3>
            <p className="text-muted-foreground mb-4">
              Get access to the complete discussion and join the conversation
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground mb-6">
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                Full content access
              </div>
              <div className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-1" />
                {post.commentCount} comments
              </div>
            </div>
            <MembershipCTAModal
              title="Unlock Full Post Access"
              description="Join VAI to read complete posts and engage with the AI community"
            >
              <Button className="px-8">
                Join to Continue Reading
              </Button>
            </MembershipCTAModal>
          </div>

          {/* Action Buttons (Disabled for Anonymous) */}
          <div className="flex items-center space-x-4 pt-6 border-t">
            <Button variant="outline" disabled className="opacity-50">
              👍 {post.upvotes}
            </Button>
            <Button variant="outline" disabled className="opacity-50">
              💬 {post.commentCount}
            </Button>
            <Button variant="outline" disabled className="opacity-50">
              Share
            </Button>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
} 