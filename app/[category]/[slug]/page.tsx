/**
 * Post Page Server Component
 *
 * Server component for individual post pages with dynamic routing.
 * Handles `/[category]/[slug]` routes and generates SEO metadata for posts.
 *
 * Features:
 * - Dynamic nested route handling with Next.js 15 Promise-based params
 * - SEO metadata generation with Open Graph support
 * - Server-side rendering with client component delegation
 * - Slug-based post identification for clean URLs
 *
 * @see PostPageClient - Client component handling post display and interactions
 */

import type { Metadata } from "next";
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
 * Creates dynamic metadata for posts based on category and slug.
 * Since we can't easily fetch post data in the metadata function,
 * we generate a readable title from the slug for SEO purposes.
 *
 * @param params - The route parameters containing category and slug
 * @returns Promise resolving to Next.js Metadata object with Open Graph support
 *
 * @example
 * // For URL: /workflows/automate-content-creation
 * // Returns: { title: "Automate Content Creation - workflows - VAI Community" }
 */
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { category, slug } = await params;

  // Transform slug into a readable title for SEO
  // We can't easily fetch post data here due to server/client architecture,
  // so we generate basic SEO from the URL structure
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    title: `${title} - ${category} - VAI Community`,
    description: `Read this ${category} post from the VAI community. Join the discussion about AI workflows, prompts, and insights.`,
    openGraph: {
      title: `${title} - VAI Community`,
      description: `A post in the ${category} category from the VAI community`,
      type: "article",
    },
  };
}

/**
 * Post Page Server Component
 *
 * Server component that delegates rendering to the client component.
 * This separation allows for server-side metadata generation while
 * maintaining client-side features like authentication, comments, and modals.
 *
 * @param params - Promise containing the dynamic route parameters
 * @returns JSX element rendering the post page
 */
export default function PostPage({ params }: PostPageProps) {
  return <PostPageClient params={params} />;
}
