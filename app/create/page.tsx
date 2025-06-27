"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import Header from "@/components/header";
import { PostCreationForm } from "@/components/post-creation-form";

export default function CreatePostPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      <Authenticated>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <PostCreationForm />
        </div>
      </Authenticated>

      <Unauthenticated>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Join VAI Community</h1>
            <p className="text-gray-600 mb-6">
              Sign in to create posts and engage with the community
            </p>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Access to post creation requires membership
              </p>
            </div>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
} 