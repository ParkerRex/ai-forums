import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString()
      : "Recently";

  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      <CardContent className={compact ? "p-0" : "p-4"}>
        <div className={compact ? "border-b border pb-3 last:border-b-0 last:pb-0" : ""}>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block">
            <h4
              className={`font-medium text-foreground mb-1 group-hover:text-primary transition-colors ${
                compact ? "text-sm" : "text-base"
              }`}
            >
              {item.title}
              <ExternalLink className="inline w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
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
              className={`text-muted-foreground opacity-70 flex items-center gap-2 ${
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
