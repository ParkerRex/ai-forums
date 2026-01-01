"use client";

import PostPageClient from "./page-client";

interface PostPageProps {
  params: {
    category: string;
    slug: string;
  };
}

export default function PostPage({ params }: PostPageProps) {
  return <PostPageClient params={params} />;
}
