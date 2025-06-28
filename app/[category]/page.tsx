import { Metadata } from "next";
import CategoryPageClient from "./page-client";

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: categoryName } = await params;
  
  // Map category names to display names for better SEO
  const categoryDisplayNames: Record<string, string> = {
    announcements: "Announcements",
    workflows: "Workflows", 
    prompts: "Prompts",
    connect: "Connect",
    content: "Content",
  };

  const displayName = categoryDisplayNames[categoryName] || categoryName;

  return {
    title: `${displayName} - VAI Community`,
    description: `Browse ${displayName.toLowerCase()} posts from the VAI community. Share and discuss AI workflows, prompts, and insights.`,
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return <CategoryPageClient params={params} />;
} 