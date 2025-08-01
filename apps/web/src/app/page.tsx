"use client";
import PostHeader from "../components/posts/post-header";
import PostList from "../components/posts/post-list";
import { redirect } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  useEffect(() => {
    if (isAuthenticated) {
      redirect("dashboard/client-only");
    } else {
      redirect("/sign-in");
    }
  }, [isAuthenticated, isLoading]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="lg:col-span-3" />
        testing auth
        <div className="lg:col-span-1" />
      </div>
    </div>
  );
}
