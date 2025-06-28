"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { PostCreationForm } from "@/components/post-creation-form";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignUpButton, SignInButton } from "@clerk/nextjs";

// Fast loading skeleton for the entire form
function CreatePostSkeleton() {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
          <div className="flex space-x-4">
            <div className="h-10 bg-muted rounded w-20" />
            <div className="h-10 bg-muted rounded w-20" />
            <div className="h-10 bg-muted rounded w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CreatePostPage() {
  return (
    <div className="min-h-screen bg-background">
      <Authenticated>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <Suspense fallback={<CreatePostSkeleton />}>
            <PostCreationForm />
          </Suspense>
        </div>
      </Authenticated>

      <Unauthenticated>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Join VAI Community</h1>
              <p className="text-muted-foreground mb-6">
                Create an account to share your AI workflows, prompts, and insights with our community of engineers from top companies.
              </p>
              <SignUpButton mode="modal" />
              <p className="text-sm text-muted-foreground">
                Already have an account? <SignInButton mode="modal" />
              </p>
            </div>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
} 