/**
 * @fileoverview Server component for resource submission pages
 * 
 * This Next.js server component handles routing for resource submission within
 * specific topics (e.g., /educate/react/submit). It generates dynamic metadata
 * for SEO and delegates UI rendering to the client component.
 * 
 * The resource submission functionality allows authenticated users to contribute
 * learning materials to the community, supporting various resource types like
 * articles, videos, courses, documentation, tools, and books.
 * 
 * @author VAI Community
 * @version 1.0.0
 */

import { Metadata } from "next";
import ResourceSubmissionPageClient from "./page-client";

/**
 * Props interface for the ResourceSubmissionPage component
 * 
 * @interface ResourceSubmissionPageProps
 * @property {Promise<{topic: string}>} params - Dynamic route parameters from Next.js
 */
interface ResourceSubmissionPageProps {
  params: Promise<{
    topic: string;
  }>;
}

/**
 * Generates dynamic metadata for resource submission pages
 * 
 * Creates SEO-optimized titles and descriptions based on the topic name
 * to improve search engine visibility and social media sharing.
 * 
 * @param {ResourceSubmissionPageProps} props - Component props with route parameters
 * @returns {Promise<Metadata>} Generated metadata object for the page
 * 
 * @example
 * ```typescript
 * // For URL /educate/react/submit
 * // Returns: {
 * //   title: "Submit React Resource - VAI Community",
 * //   description: "Submit a new React learning resource to the VAI community..."
 * // }
 * ```
 */
export async function generateMetadata({ params }: ResourceSubmissionPageProps): Promise<Metadata> {
  const { topic: topicName } = await params;
  
  return {
    title: `Submit ${topicName} Resource - VAI Community`,
    description: `Submit a new ${topicName} learning resource to the VAI community. Share articles, videos, courses, and tools.`,
  };
}

/**
 * Server component for resource submission pages
 * 
 * Acts as a wrapper around the client component, handling server-side metadata
 * generation while passing route parameters to the client for interactive
 * form functionality and real-time validation.
 * 
 * @param {ResourceSubmissionPageProps} props - Component props with route parameters
 * @returns {JSX.Element} Rendered resource submission client component
 * 
 * @example
 * ```typescript
 * // Next.js automatically calls this for routes like /educate/react/submit
 * // The topic parameter is used to pre-fill form context
 * ```
 */
export default function ResourceSubmissionPage({ params }: ResourceSubmissionPageProps) {
  return <ResourceSubmissionPageClient params={params} />;
}
