"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, TrendingUp } from "lucide-react";
import { Authenticated, Unauthenticated } from "convex/react";
import { MembershipCTAModal } from "@/components/membership-cta-modal";

export default function PostSidebar() {
  return (
    <div className="space-y-6">
      {/* Create Post Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Authenticated>
            <Link href="/create" prefetch={true}>
              <Button className="w-full bg-green-700 hover:bg-green-800">
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            </Link>
          </Authenticated>
          <Unauthenticated>
            <MembershipCTAModal
              title="Share Your Ideas"
              description="Join VAI to create posts and share your AI insights with the community"
            >
              <Button className="w-full bg-green-700 hover:bg-green-800">
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            </MembershipCTAModal>
          </Unauthenticated>
          <p className="text-xs text-gray-500">Share your AI workflows, prompts, and insights with the community</p>
        </CardContent>
      </Card>

      {/* Recent AI News Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Recent AI News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                OpenAI Announces GPT-5 Development
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                Next-generation model promises significant improvements in reasoning and multimodal capabilities.
              </p>
              <span className="text-xs text-gray-400">2 hours ago</span>
            </div>
            <div className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                Google Releases Gemini 2.0 Flash
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                New model features enhanced speed and efficiency for real-time AI applications.
              </p>
              <span className="text-xs text-gray-400">4 hours ago</span>
            </div>
            <div className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                Meta AI Unveils Llama 3.3 70B
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                Open-source model achieves performance comparable to larger proprietary models.
              </p>
              <span className="text-xs text-gray-400">6 hours ago</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About VAI Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About VAI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 leading-relaxed">
            A community platform for AI professionals to share workflows, prompts, insights, and connect with like-minded practitioners.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
