/**
 * Category Page Server Component
 *
 * This is the server component for category pages in the Next.js 15 app router.
 * Handles dynamic routing for `/[category]` paths and generates SEO metadata.
 *
 * Features:
 * - Dynamic route handling with Next.js 15 Promise-based params
 * - SEO metadata generation for category pages
 * - Server-side rendering with client component delegation
 * - Category name mapping for better SEO titles
 *
 * @see CategoryPageClient - Client component that handles interactivity
 */

import { Metadata } from "next";
import CategoryPageClient from "./page-client";

/**
 * Props for the CategoryPage server component
 *
 * In Next.js 15, dynamic route params are provided as Promises
 * to support streaming and better performance.
 */
interface CategoryPageProps {
  /** Promise containing the dynamic route parameters */
  params: Promise<{
    /** The category name from the URL path */
    category: string;
  }>;
}

/**
 * Generate SEO metadata for category pages
 *
 * Creates dynamic metadata based on the category name for better SEO.
 * Maps internal category names to user-friendly display names.
 *
 * @param params - The route parameters containing category name
 * @returns Promise resolving to Next.js Metadata object
 *
 * @example
 * // For URL: /workflows
 * // Returns: { title: "Workflows - VAI Community", description: "Browse workflows posts..." }
 */
export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category: categoryName } = await params;

  // Map internal category names to user-friendly display names for SEO
  // This allows clean URLs while maintaining descriptive page titles
  const categoryDisplayNames: Record<string, string> = {
    announcements: "Announcements",
    workflows: "Workflows",
    prompts: "Prompts",
    connect: "Connect",
    content: "Content",
  };

  // Use mapped name or fallback to original category name
  const displayName = categoryDisplayNames[categoryName] || categoryName;

  return {
    title: `${displayName} - VAI Community`,
    description: `Browse ${displayName.toLowerCase()} posts from the VAI community. Share and discuss AI workflows, prompts, and insights.`,
  };
}

/**
 * Category Page Server Component
 *
 * Server component that delegates rendering to the client component.
 * This pattern allows for server-side metadata generation while maintaining
 * client-side interactivity for features like post filtering and authentication.
 *
 * @param params - Promise containing the dynamic route parameters
 * @returns JSX element rendering the category page
 */
export default function CategoryPage({ params }: CategoryPageProps) {
  return <CategoryPageClient params={params} />;
}
