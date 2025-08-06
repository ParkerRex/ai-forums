/**
 * News components for displaying news items
 */

import { ExternalLink } from "lucide-react";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface NewsItem {
  title: string;
  url: string;
  content?: string;
  description?: string;
  author?: string;
  publishedDate?: string;
  source?: string;
}

/**
 * NewsCard component for displaying a single news item
 */
export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="line-clamp-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-2"
          >
            {item.title}
            <ExternalLink className="h-4 w-4" />
          </a>
        </CardTitle>
        {item.source && (
          <CardDescription>
            {item.source}{" "}
            {item.publishedDate &&
              `• ${new Date(item.publishedDate).toLocaleDateString()}`}
          </CardDescription>
        )}
      </CardHeader>
      {(item.content || item.description) && (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {item.content || item.description}
          </p>
          {item.author && (
            <p className="text-xs text-muted-foreground mt-2">
              By {item.author}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
