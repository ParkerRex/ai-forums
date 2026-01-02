import CategoryPageClient from "./page-client";

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  return <CategoryPageClient params={resolvedParams} />;
}
