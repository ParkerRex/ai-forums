import { Metadata } from "next";
import ResourceSubmissionPageClient from "./page-client";

interface ResourceSubmissionPageProps {
  params: Promise<{
    topic: string;
  }>;
}

export async function generateMetadata({ params }: ResourceSubmissionPageProps): Promise<Metadata> {
  const { topic: topicName } = await params;
  
  return {
    title: `Submit ${topicName} Resource - VAI Community`,
    description: `Submit a new ${topicName} learning resource to the VAI community. Share articles, videos, courses, and tools.`,
  };
}

export default function ResourceSubmissionPage({ params }: ResourceSubmissionPageProps) {
  return <ResourceSubmissionPageClient params={params} />;
}
