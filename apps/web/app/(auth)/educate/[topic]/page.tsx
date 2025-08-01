/**
 * @fileoverview Server component for individual topic pages
 * 
 * This Next.js server component handles routing for individual learning topics
 * (e.g., /educate/react, /educate/typescript). It generates dynamic metadata
 * for SEO purposes and delegates the actual UI rendering to the client component.
 * 
 * The server component approach allows for:
 * - Dynamic metadata generation for better SEO
 * - Server-side parameter extraction
 * - Optimal loading performance
 * 
 * @author VAI Community
 * @version 1.0.0
 */

import { Metadata } from "next";
import TopicPageClient from "./page-client";

/**
 * Props interface for the TopicPage component
 * 
 * @interface TopicPageProps
 * @property {Promise<{topic: string}>} params - Dynamic route parameters wrapped in Promise
 */
interface TopicPageProps {
  params: Promise<{
    topic: string;
  }>;
}

/**
 * Generates dynamic metadata for topic pages for SEO optimization
 * 
 * Creates page-specific titles and descriptions based on the topic name
 * from the URL parameters. This improves search engine visibility and
 * provides better social media sharing previews.
 * 
 * @param {TopicPageProps} props - Component props containing route parameters
 * @returns {Promise<Metadata>} Generated metadata object
 * 
 * @example
 * ```typescript
 * // For URL /educate/react
 * // Returns: {
 * //   title: "React Resources - VAI Community",
 * //   description: "Browse React learning resources from the VAI community..."
 * // }
 * ```
 */
export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { topic: topicName } = await params;
  
  // Capitalize first letter for display name
  const displayName = topicName.charAt(0).toUpperCase() + topicName.slice(1);
  
  return {
    title: `${displayName} Resources - VAI Community`,
    description: `Browse ${displayName} learning resources from the VAI community. Discover articles, videos, courses, and tools.`,
  };
}

/**
 * Server component for individual topic pages
 * 
 * Acts as a thin wrapper around the client component, handling server-side
 * concerns like metadata generation while passing through the dynamic route
 * parameters to the client component for interactive functionality.
 * 
 * @param {TopicPageProps} props - Component props containing route parameters
 * @returns {JSX.Element} Rendered topic page client component
 * 
 * @example
 * ```typescript
 * // Next.js automatically calls this for routes like /educate/react
 * // The topic parameter is extracted from the URL and passed to the client
 * ```
 */
export default function TopicPage({ params }: TopicPageProps) {
  return <TopicPageClient params={params} />;
}
