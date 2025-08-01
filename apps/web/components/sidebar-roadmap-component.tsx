"use client";
import React from "react";

import { useState, useEffect } from "react";
import { useGitHubIssues } from "@/lib/github";
import { Loader2, ChevronDown } from "lucide-react";
import { BugReportModal } from "../components/bug-report-modal";
import { FeatureRequestModal } from "../components/feature-request-modal";

const CACHE_KEY = "vai_roadmap_cache";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export function SidebarRoadmapComponent() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [cachedIssues, setCachedIssues] = useState<typeof issues>([]);
  const [hasLoadedCache, setHasLoadedCache] = useState(false);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);

  const { issues, isLoading, error } = useGitHubIssues(1);

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

  const displayIssues = cachedIssues.length > 0 ? cachedIssues : issues;
  const visibleIssues = isExpanded ? displayIssues : displayIssues.slice(0, 3);

  if (error) {
    return (
      <div className="p-4 text-xs text-gray-500 dark:text-gray-400">
        Unable to load roadmap
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Roadmap
        </h3>
        {displayIssues.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400 dark:text-gray-500" />
        </div>
      ) : (
        <div className="space-y-1">
          {visibleIssues.map((issue) => (
            <a
              key={issue.id}
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-1 text-xs text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              {issue.title}
            </a>
          ))}

          {!isExpanded && displayIssues.length > 3 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              +{displayIssues.length - 3} more
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2 text-xs">
        <button
          onClick={() => setIsBugModalOpen(true)}
          className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        >
          Report Bug
        </button>
        <span className="text-gray-400 dark:text-gray-500">|</span>
        <button
          onClick={() => setIsFeatureModalOpen(true)}
          className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        >
          Request Feature
        </button>
      </div>

      <BugReportModal
        isOpen={isBugModalOpen}
        onClose={() => setIsBugModalOpen(false)}
      />
      <FeatureRequestModal
        isOpen={isFeatureModalOpen}
        onClose={() => setIsFeatureModalOpen(false)}
      />
    </div>
  );
}
