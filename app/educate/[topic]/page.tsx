import { Metadata } from "next";
import TopicPageClient from "./page-client";

interface TopicPageProps {
  params: Promise<{
    topic: string;
  }>;
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { topic: topicName } = await params;
  
  const displayName = topicName.charAt(0).toUpperCase() + topicName.slice(1);
  
  return {
    title: `${displayName} Resources - VAI Community`,
    description: `Browse ${displayName} learning resources from the VAI community. Discover articles, videos, courses, and tools.`,
  };
}

export default function TopicPage({ params }: TopicPageProps) {
  return <TopicPageClient params={params} />;
}
