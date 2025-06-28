import { Metadata } from "next";
import PostPageClient from "./page-client";

interface PostPageProps {
  params: Promise<{
    category: string;
    slug: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { category, slug } = await params;
  
  // We can't easily fetch the post data here in the current setup,
  // so we'll use category and slug for basic SEO
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return {
    title: `${title} - ${category} - VAI Community`,
    description: `Read this ${category} post from the VAI community. Join the discussion about AI workflows, prompts, and insights.`,
    openGraph: {
      title: `${title} - VAI Community`,
      description: `A post in the ${category} category from the VAI community`,
      type: 'article',
    },
  };
}

export default function PostPage({ params }: PostPageProps) {
  return <PostPageClient params={params} />;
} 