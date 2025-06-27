"use client";

import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Authenticated, Unauthenticated } from "convex/react";
import PostDetail from "@/components/post-detail";
import PostSidebar from "@/components/post-sidebar";
import PostHeader from "@/components/post-header";
import { MembershipCTAModal } from "@/components/membership-cta-modal";
import { Button } from "@/components/ui/button";
import { Lock, Eye, MessageSquare } from "lucide-react";

// TODO: Update with real data from Db
const posts = [
  {
    id: 1,
    title:
      "What's your favorite debugging technique that most developers don't know about?",
    author: "debugmaster",
    community: "programming",
    timeAgo: "2h",
    votes: 127,
    comments: 43,
    content:
      "I've been coding for 10+ years and recently discovered rubber duck debugging. Game changer. What are your hidden gems?\n\nFor those who don't know, rubber duck debugging is when you explain your code line by line to a rubber duck (or any inanimate object). The act of verbalizing your logic often helps you spot the bug.\n\nWhat debugging techniques have saved you hours of frustration?",
    submittedDate: "Jan 15 2025",
    upvotePercentage: 89,
  },
  {
    id: 2,
    title:
      "Built a CLI tool to automatically generate API documentation from TypeScript interfaces",
    author: "parkerrex",
    community: "typescript",
    timeAgo: "4h",
    votes: 89,
    comments: 21,
    content:
      "Tired of maintaining docs manually? This tool parses your TS files and generates markdown docs. Open source and looking for feedback!\n\nI'm trying to self-host this tool on my development server (16GB RAM, ARM architecture) but running into compatibility issues, especially with some dependencies that seem designed for x86.\n\nHas anyone successfully set this up on ARM? Could you share any workarounds or guides for ARM compatibility? I'd appreciate any advice, documentation, or video tutorials you've found helpful. Thanks in advance!",
    submittedDate: "Jan 15 2025",
    upvotePercentage: 92,
  },
];

interface PageProps {
  params: { id: string };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = posts.find((p) => p.id === Number.parseInt(params.id));

  if (!post) {
    return {
      title: "Post Not Found | VAI Community",
      description: "The requested post could not be found on VAI Community.",
    };
  }

  // Create excerpt from content (first 160 characters for meta description)
  const excerpt = post.content.length > 160
    ? post.content.substring(0, 157) + "..."
    : post.content;

  const title = `${post.title} | VAI Community`;
  const description = excerpt;
  const url = `https://vai.community/post/${post.id}`; // TODO: Update with actual domain
  const siteName = "VAI Community";

  return {
    title,
    description,
    keywords: [
      "AI",
      "artificial intelligence",
      "community",
      "programming",
      "workflows",
      "prompts",
      post.community,
      "tech discussion"
    ],
    authors: [{ name: post.author }],
    creator: post.author,
    publisher: siteName,

    // Open Graph tags
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: "article",
      locale: "en_US",
      authors: [post.author],
      publishedTime: post.submittedDate,
      section: post.community,
      tags: ["AI", "programming", post.community],
    },

    // Twitter Card tags
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: `@${post.author}`, // TODO: Map to actual Twitter handles if available
      site: "@VAICommunity", // TODO: Update with actual Twitter handle
    },

    // Additional meta tags
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    // Canonical URL
    alternates: {
      canonical: url,
    },
  };
}

export default function PostPage({ params }: PageProps) {
  const post = posts.find((p) => p.id === Number.parseInt(params.id));

  if (!post) {
    notFound();
  }

  return (
    <div className="font-mono min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <PostHeader />

        <Authenticated>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <PostDetail post={post} />
            </div>
            <div className="lg:col-span-1">
              <PostSidebar />
            </div>
          </div>
        </Authenticated>

        <Unauthenticated>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              {/* Post Preview for Anonymous Users */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-6">
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <span className="text-green-700 font-medium">/ai/{post.community}</span>
                    <span className="mx-2">•</span>
                    <span>posted by /u/{post.author}</span>
                    <span className="mx-2">•</span>
                    <span>{post.timeAgo} ago</span>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 mb-6">{post.title}</h1>

                  {/* Content Preview with Blur Effect */}
                  <div className="relative mb-6">
                    <div className="prose prose-sm max-w-none text-gray-700 blur-sm select-none">
                      <p className="mb-4 leading-relaxed">
                        {post.content.substring(0, 200)}...
                      </p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white"></div>
                  </div>

                  {/* Membership CTA */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Lock className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Join to Read Full Post
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Get access to the complete discussion and join the conversation
                    </p>
                    <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 mb-6">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        Full content access
                      </div>
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {post.comments} comments
                      </div>
                    </div>
                    <MembershipCTAModal
                      title="Unlock Full Post Access"
                      description="Join VAI to read complete posts and engage with the AI community"
                    >
                      <Button className="bg-green-700 hover:bg-green-800 text-white px-8">
                        Join to Continue Reading
                      </Button>
                    </MembershipCTAModal>
                  </div>

                  {/* Action Buttons (Disabled for Anonymous) */}
                  <div className="flex items-center space-x-4 text-sm text-gray-400 border-t pt-4 mt-6">
                    <Button variant="ghost" size="sm" className="p-2 h-auto cursor-not-allowed opacity-50">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {post.comments} comments
                    </Button>
                    <Button variant="ghost" size="sm" className="p-2 h-auto cursor-not-allowed opacity-50">
                      Share
                    </Button>
                    <Button variant="ghost" size="sm" className="p-2 h-auto cursor-not-allowed opacity-50">
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <PostSidebar />
            </div>
          </div>
        </Unauthenticated>
      </div>
    </div>
  );
}
