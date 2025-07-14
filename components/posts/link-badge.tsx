"use client";

import { Badge } from "@/components/ui/badge";
import { LinkIcon } from "@/components/icons/link";
import { cn } from "@/lib/utils";

export interface LinkBadgeProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function LinkBadge({ href, children, className }: LinkBadgeProps) {
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 text-sm font-medium",
        "bg-muted/50 hover:bg-muted/80 transition-colors",
        "border border-border/50 hover:border-border",
        className
      )}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={typeof children === 'string' ? children : href}
        className="no-underline"
      >
        <LinkIcon size={14} className="text-muted-foreground" />
        <span className="text-foreground">{children}</span>
      </a>
    </Badge>
  );
} 