"use client";
import React from "react";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BugReportModal } from "@/components/bug-report-modal";
import { FeatureRequestButton } from "@/components/feature-request-button";
import { useGitHubIssues } from "@/lib/github";
import { ExternalLink, Loader2, Bug, RefreshCw } from "lucide-react";
import { ExpandIcon, type ExpandIconHandle } from "@/components/ui/expand";
import { toast } from "sonner";

const CACHE_KEY = "vai_roadmap_cache";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_DURATION = 30 * 1000; // 30 seconds

export function SidebarRoadmapComponent() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [allIssues, setAllIssues] = useState<
    { id: number; number: number; title: string; html_url: string }[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cachedIssues, setCachedIssues] = useState<typeof issues>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [hasLoadedCache, setHasLoadedCache] = useState(false);
  const expandIconRef = useRef<ExpandIconHandle>(null);

  const { issues, isLoading, error, refetch } = useGitHubIssues(1);

  // Fetch additional GitHub issues beyond the first page.
  const loadMoreIssues = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await fetch(
        `/api/github/issues?page=${nextPage}&per_page=50`,
      );
      if (response.ok) {
        const newIssues = await response.json();
        if (newIssues.length > 0) {
          setAllIssues((prev) => [...prev, ...newIssues]);
          setCurrentPage(nextPage);
        }
      }
    } catch (error) {
      console.error("Failed to load more issues:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage]);

  // Load cached issues on mount
  useEffect(() => {
    if (!hasLoadedCache) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setCachedIssues(data);
          }
        }
      } catch (error) {
        console.error("Failed to load from cache:", error);
      }
      setHasLoadedCache(true);
    }
  }, [hasLoadedCache]);

  // Cache issues when they update
  useEffect(() => {
    if (issues.length > 0) {
      setCachedIssues(issues);
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: issues,
            timestamp: Date.now(),
          }),
        );
      } catch (error) {
        console.error("Failed to cache issues:", error);
      }
    }
  }, [issues]);

  // Load more issues when dialog opens
  useEffect(() => {
    if (isDialogOpen && allIssues.length === 0 && issues.length > 0) {
      setAllIssues(issues);
      loadMoreIssues();
    }
  }, [isDialogOpen, issues, allIssues.length, loadMoreIssues]);

  const handleRefresh = async () => {
    const now = Date.now();
    if (now - lastRefresh < RATE_LIMIT_DURATION) {
      toast.error("Woah, you're doing that too much! Please wait a moment.");
      return;
    }

    setRefreshing(true);
    setLastRefresh(now);
    await refetch();
    setRefreshing(false);
  };

  const displayIssues = cachedIssues.length > 0 ? cachedIssues : issues;

  if (error) {
    return (
      <>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Roadmap</h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-accent/50"
                onClick={handleRefresh}
                disabled={refreshing || isLoading}
              >
                <RefreshCw
                  className={`h-3 w-3 transition-transform ${refreshing ? "animate-[spin_0.5s_linear_infinite]" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-accent/50"
                onClick={() => setIsDialogOpen(true)}
              >
                <ExpandIcon size={12} data-testid="expand-icon" />
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Failed to load roadmap items.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 w-full h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsBugReportOpen(true)}
              >
                <Bug className="h-3 w-3 mr-1.5" />
                Report Bug
              </Button>
              <FeatureRequestButton />
            </div>
          </div>
        </div>
        <BugReportModal
          isOpen={isBugReportOpen}
          onClose={() => setIsBugReportOpen(false)}
        />
      </>
    );
  }

  const IssuesList = ({
    issues: tableIssues,
    showCaption = true,
  }: {
    issues: { id: number; number: number; title: string; html_url: string }[];
    showCaption?: boolean;
  }) => (
    <div className="w-full overflow-hidden">
      {tableIssues.map((issue) => (
        <div
          key={issue.id}
          className="flex items-start gap-2 pb-2 last:pb-0 border-b last:border-b-0 border-border/30"
        >
          <a
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-start gap-1 hover:underline w-full"
          >
            <span className="break-words whitespace-normal flex-1 min-w-0 text-xs leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
              {issue.title}
            </span>
            <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground/40 mt-0.5 group-hover:text-muted-foreground/60 transition-colors opacity-0 group-hover:opacity-100" />
          </a>
        </div>
      ))}
      {showCaption && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <a
            href="https://github.com/joinvai/vai-vex/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:underline"
          >
            View all issues on GitHub
          </a>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Roadmap</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-accent/50"
              onClick={handleRefresh}
              disabled={refreshing || isLoading}
            >
              <RefreshCw
                className={`h-3 w-3 transition-transform ${refreshing ? "animate-[spin_0.5s_linear_infinite]" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-accent/50"
              onClick={() => setIsDialogOpen(true)}
              onMouseEnter={() => expandIconRef.current?.startAnimation()}
              onMouseLeave={() => expandIconRef.current?.stopAnimation()}
            >
              <ExpandIcon ref={expandIconRef} size={12} data-testid="expand-icon" />
            </Button>
          </div>
        </div>
        <div
          className={`space-y-3 transition-all ${refreshing ? "blur-sm opacity-50" : ""}`}
        >
          {isLoading ? (
            <div
              className="flex items-center justify-center py-4"
              role="status"
            >
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div
              className={`text-xs space-y-1 transition-all ${refreshing ? "blur-sm opacity-50" : ""}`}
            >
              {displayIssues.slice(0, 5).map((issue) => (
                <div key={issue.id} className="group">
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex-1 leading-tight">
                        {issue.title}
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap flex-shrink-0">
                        #{issue.number}
                      </span>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          )}

          <div className="pt-1 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 w-full h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setIsBugReportOpen(true)}
            >
              Report Bug
            </Button>
            <FeatureRequestButton />
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">
              Project Roadmap
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              All open issues and upcoming features for VAI VEX
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-6">
            {allIssues.length > 0 ? (
              <div className="space-y-4">
                <div className="grid gap-3">
                  {allIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-3 hover:no-underline"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm leading-relaxed break-words group-hover:text-primary transition-colors">
                            {issue.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Issue #{issue.number}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground/60 mt-0.5 group-hover:text-muted-foreground transition-colors" />
                      </a>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-center gap-3 pt-4 border-t">
                  {isLoadingMore && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                  <a
                    href="https://github.com/joinvai/vai-vex/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors hover:underline"
                  >
                    View all issues on GitHub →
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
      />
    </>
  );
}
