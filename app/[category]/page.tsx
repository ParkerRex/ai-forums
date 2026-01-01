"use client";

import CategoryPageClient from "./page-client";

interface CategoryPageProps {
  params: {
    category: string;
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return <CategoryPageClient params={params} />;
}
