/**
 * Post Page Server Component
 *
 * Server component for individual post pages with dynamic routing.
 * Handles `/[category]/[slug]` routes and generates SEO metadata for posts.
 *
 * Features:
 * - Dynamic nested route handling with Next.js 15 Promise-based params
 * - SEO metadata generation with Open Graph support
 * - Server-side data fetching for faster initial load
 * - Streaming with Suspense for progressive loading
 *
 * @see PostPageClient - Client component handling post display and interactions
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostDetailSkeleton } from "@/components/posts/post-skeletons";
import { getPostBySlug, serializePost, validatePostCategory } from "@/lib/server/posts";
import PostPageClient from "./page-client";

/**
 * Props for the PostPage server component
 *
 * Contains both category and slug parameters for nested dynamic routing.
 * In Next.js 15, these are provided as Promises for better performance.
 */
interface PostPageProps {
  /** Promise containing the dynamic route parameters */
  params: Promise<{
    /** The category name from the URL path */
    category: string;
    /** The post slug from the URL path */
    slug: string;
  }>;
}

/**
 * Generate SEO metadata for individual post pages
 *
 * Fetches actual post data to generate accurate metadata.
 * Uses React's cache() function to avoid duplicate database queries.
 *
 * @param params - The route parameters containing category and slug
 * @returns Promise resolving to Next.js Metadata object with Open Graph support
 */
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { category, slug } = await params;

  // Fetch actual post data for accurate SEO
  const post = await getPostBySlug(slug);

  if (!post || post.category?.name !== category) {
    return {
      title: "Post Not Found - VAI Community",
      description: "The requested post could not be found.",
    };
  }

  const authorName = post.member
    ? `${post.member.firstName} ${post.member.lastName}`
    : "VAI Community";

  return {
    title: `${post.title} - ${post.category?.displayName || category} - VAI Community`,
    description:
      post.preview || `Read this ${category} post from ${authorName} in the VAI community.`,
    openGraph: {
      title: `${post.title} - VAI Community`,
      description:
        post.preview || `A post in the ${post.category?.displayName || category} category`,
      type: "article",
      authors: [authorName],
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.editedAt?.toISOString(),
    },
  };
}

/**
 * Post Page Server Component
 *
 * Fetches post data on the server and passes it to the client component.
 * Uses Suspense for streaming to show content progressively.
 *
 * @param params - Promise containing the dynamic route parameters
 * @returns JSX element rendering the post page
 */
export default async function PostPage({ params }: PostPageProps) {
  const { category, slug } = await params;

  // Validate params
  if (!category || !slug || typeof category !== "string" || typeof slug !== "string") {
    notFound();
  }

  // Fetch post data on the server
  const post = await getPostBySlug(slug);

  // Post not found
  if (!post) {
    notFound();
  }

  // Category mismatch - wrong URL
  if (!validatePostCategory(post, category)) {
    notFound();
  }

  // Serialize dates for client component
  const serializedPost = serializePost(post);

  return (
    <Suspense fallback={<PostDetailSkeleton />}>
      <PostPageClient params={params} serverPost={serializedPost} />
    </Suspense>
  );
}
