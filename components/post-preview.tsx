"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Eye, Heart } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface PostPreviewProps {
  title: string;
  content: string;
  categoryName?: string;
  categoryIcon?: string;
  authorName?: string;
  className?: string;
}

export function PostPreview({
  title,
  content,
  categoryName = "Selected Category",
  categoryIcon = "📝",
  authorName = "You",
  className = ""
}: PostPreviewProps) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {categoryIcon} {categoryName}
          </Badge>
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-1" />
            {currentDate}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          {title || "Your post title will appear here"}
        </h1>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-green-100 text-green-700 text-sm">
                {authorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900">{authorName}</p>
              <p className="text-xs text-gray-500">Just now</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              <span>0</span>
            </div>
            <div className="flex items-center">
              <Heart className="w-4 h-4 mr-1" />
              <span>0</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="prose prose-sm max-w-none">
          {content ? (
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-6">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 mt-5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-medium mb-2 mt-4">{children}</h3>,
                p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-green-500 pl-4 py-2 mb-4 italic text-gray-600 bg-gray-50">
                    {children}
                  </blockquote>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                  ) : (
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                      <code className="text-sm font-mono">{children}</code>
                    </pre>
                  );
                },
                a: ({ children, href }) => (
                  <a href={href} className="text-green-700 underline hover:text-green-800" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <div className="text-gray-500 italic py-8 text-center">
              Your post content will appear here as you type...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PostPreview; 