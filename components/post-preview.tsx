"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, MessageSquare, ThumbsUp, Calendar } from "lucide-react";

interface PostPreviewProps {
  post: {
    _id: string;
    title: string;
    content: string;
    createdAt: number;
    author: {
      firstName: string;
      lastName: string;
    };
  };
  isLoading?: boolean;
}

export default function PostPreview({ post, isLoading }: PostPreviewProps) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
            <div className="h-4 bg-muted rounded w-4/6"></div>
          </div>
          <div className="flex space-x-4">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No preview available</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-muted-foreground/20 transition-colors">
      <div className="space-y-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <span>Preview</span>
          <span className="mx-2">•</span>
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
        
        <h2 className="text-xl font-bold text-foreground">{post.title}</h2>
        
        <div className="text-muted-foreground">
          {post.content}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Draft</span>
          </div>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
} 