import { Card, CardContent } from "../components/ui/card";
import { ExternalLink } from "lucide-react";

interface NewsItem {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
  source: string;
}

interface NewsCardProps {
  item: NewsItem;
  compact?: boolean;
}

export function NewsCard({ item, compact = false }: NewsCardProps) {
  // Parse the published date and verify it is valid; otherwise fall back to "Recently"
  const parsedDate = item.publishedDate ? new Date(item.publishedDate) : null;
  const timeAgo =
    parsedDate && !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString()
      : "Recently";

  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      <CardContent className={compact ? "p-0" : "p-4"}>
        <div
          className={
            compact ? "border border-b pb-3 last:border-b-0 last:pb-0" : ""
          }
        >
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <h4
              className={`text-foreground group-hover:text-primary mb-1 font-medium transition-colors ${
                compact ? "text-sm" : "text-base"
              }`}
            >
              {item.title}
              <ExternalLink className="ml-1 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </h4>
            {item.summary && (
              <p
                className={`text-muted-foreground mb-2 line-clamp-2 ${
                  compact ? "text-xs" : "text-sm"
                }`}
              >
                {item.summary}
              </p>
            )}
            <div
              className={`text-muted-foreground flex items-center gap-2 opacity-70 ${
                compact ? "text-xs" : "text-sm"
              }`}
            >
              <span>{timeAgo}</span>
              <span>•</span>
              <span>{item.source}</span>
            </div>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
