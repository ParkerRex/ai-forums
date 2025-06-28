import PostPageClient from "./page-client";

interface PageProps {
  params: {
    id: string;
  };
}

export default function PostPage({ params }: PageProps) {
  return <PostPageClient params={params} />;
}
