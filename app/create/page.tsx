"use client";

import { Suspense } from "react";
import { PostCreationForm } from "@/components/posts/post-creation-form";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CreatePostSkeleton() {
  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="bg-muted h-4 w-1/4 rounded" />
            <div className="bg-muted h-10 rounded" />
            <div className="bg-muted h-4 w-1/4 rounded" />
            <div className="bg-muted h-10 rounded" />
            <div className="bg-muted h-32 rounded" />
          </div>
          <div className="flex space-x-4">
            <div className="bg-muted h-10 w-20 rounded" />
            <div className="bg-muted h-10 w-20 rounded" />
            <div className="bg-muted h-10 w-24 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AuthenticatedContent() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
      <Suspense fallback={<CreatePostSkeleton />}>
        <PostCreationForm />
      </Suspense>
    </div>
  );
}

function UnauthenticatedContent() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="bg-card border-border rounded-none border p-8 text-center shadow-sm">
          <h1 className="text-foreground mb-4 text-2xl font-bold">Members Only</h1>
          <p className="text-muted-foreground mb-6">
            VAI Community is an exclusive platform for engineers from top companies to share AI
            workflows, prompts, and insights. Membership is required to create content.
          </p>
          <div className="space-y-4">
            <Button
              variant="default"
              className="w-full"
              onClick={() => (window.location.href = "/login")}
            >
              Sign In (Members Only)
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = "/pricing")}
            >
              Become a Member
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingContent() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
      <CreatePostSkeleton />
    </div>
  );
}

export default function CreatePostPage() {
  const { user, isLoading } = useAuth();

  return (
    <div className="bg-background text-foreground min-h-screen">
      {isLoading ? (
        <LoadingContent />
      ) : user ? (
        <AuthenticatedContent />
      ) : (
        <UnauthenticatedContent />
      )}
    </div>
  );
}
