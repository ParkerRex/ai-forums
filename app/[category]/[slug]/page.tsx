import PostPageClient from "./page-client";

interface PostPageProps {
  params: Promise<{
    category: string;
    slug: string;
  }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const resolvedParams = await params;
  return <PostPageClient params={resolvedParams} />;
}
