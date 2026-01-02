/**
 * @fileoverview Client component for individual topic pages with resource management
 *
 * This component displays all learning resources for a specific topic, providing
 * comprehensive filtering, sorting, and interaction capabilities. It serves as
 * the main interface for users to discover and engage with educational content.
 *
 * Key features:
 * - Resource display with voting and bookmarking
 * - Advanced filtering by type, difficulty, and payment status
 * - Real-time search across resource titles and descriptions
 * - Sorting by newest or most popular
 * - View tracking for resource analytics
 * - Authentication-gated interactions (voting, bookmarking)
 * - Responsive design with loading states
 *
 * @author VAI Community
 * @version 1.0.0
 */

"use client";
import { ArrowUpIcon, BookOpen, Plus, Search } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { use, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentMember } from "@/hooks/use-current-member";
import {
  type Resource,
  useResources,
  useTrackResourceView,
  useUserResourceVote,
  useVoteOnResource,
} from "@/hooks/use-resources";
import { useTopicByName } from "@/hooks/use-topics";

/**
 * Props interface for the TopicPageClient component
 *
 * @interface TopicPageClientProps
 * @property {Promise<{topic: string}>} params - Dynamic route parameters from Next.js
 */
interface TopicPageClientProps {
  params: Promise<{
    topic: string;
  }>;
}

/**
 * Resource card component that displays a single learning resource with interactions
 *
 * This component handles the presentation and interaction logic for individual
 * resources including voting, view tracking, and external link navigation.
 * It implements optimistic updates for better user experience during voting.
 *
 * @param {Object} props - Component properties
 * @param {Resource} props.resource - The resource data to display
 * @returns {JSX.Element} Rendered resource card component
 */
function ResourceCard({ resource }: { resource: Resource }) {
  const { member } = useCurrentMember();
  const voteOnResource = useVoteOnResource();
  const trackResourceView = useTrackResourceView();
  const { data: userVoteData } = useUserResourceVote(resource.id);

  // Local state for voting interactions and optimistic updates
  const [isVoting, setIsVoting] = useState(false);
  const [optimisticNetVotes, setOptimisticNetVotes] = useState(resource.netVotes);
  const [optimisticUserVote, setOptimisticUserVote] = useState<string | null>(null);

  // Use optimistic state if available, otherwise fall back to server state
  const currentUserVote = optimisticUserVote !== null ? optimisticUserVote : userVoteData?.voteType;

  /**
   * Handles upvote button clicks with optimistic updates
   */
  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isVoting || !member) return;
    setIsVoting(true);

    // Determine if this is an upvote or vote removal
    const voteType = currentUserVote === "upvote" ? "remove" : "upvote";
    let newNetVotes = optimisticNetVotes;
    let newUserVote: string | null = null;

    // Calculate optimistic vote counts
    if (voteType === "upvote") {
      newNetVotes = optimisticNetVotes + 1;
      newUserVote = "upvote";
    } else {
      newNetVotes = optimisticNetVotes - 1;
      newUserVote = null;
    }

    // Apply optimistic updates immediately for responsive UI
    setOptimisticNetVotes(newNetVotes);
    setOptimisticUserVote(newUserVote);

    try {
      // Sync with server and get actual vote counts
      const result = await voteOnResource.mutateAsync({
        resourceId: resource.id,
        voteType,
      });
      // Update with server-confirmed values
      setOptimisticNetVotes(result.netVotes);
      setOptimisticUserVote(result.newVoteType);
    } catch (error) {
      // Revert optimistic updates on error
      setOptimisticNetVotes(resource.netVotes);
      setOptimisticUserVote(userVoteData?.voteType || null);
      console.error("Failed to vote:", error);
    } finally {
      setIsVoting(false);
    }
  };

  /**
   * Handles resource link clicks with view tracking
   */
  const handleResourceClick = async () => {
    try {
      // Track view for analytics (fire-and-forget)
      await trackResourceView.mutateAsync(resource.id);
    } catch (error) {
      console.error("Failed to track resource view:", error);
    }
    // Open resource in new tab with security attributes
    window.open(resource.url, "_blank", "noopener,noreferrer");
  };

  /**
   * Returns appropriate emoji icon for resource type
   */
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      video: "\uD83C\uDFA5",
      course: "\uD83C\uDF93",
      book: "\uD83D\uDCDA",
      tool: "\uD83D\uDD27",
      documentation: "\uD83D\uDCD6",
    };
    return icons[type] || "\uD83D\uDCC4";
  };

  return (
    <Card
      className="hover:border-primary transition-colors cursor-pointer"
      onClick={handleResourceClick}
    >
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getTypeIcon(resource.type)}
            {resource.title}
          </span>
          <div className="flex items-center gap-2">
            {member && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpvote(e);
                }}
                disabled={isVoting}
                className={`hover:bg-transparent ${
                  currentUserVote === "upvote" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <ArrowUpIcon size={16} />
              </Button>
            )}
            <span className="text-sm font-medium text-muted-foreground">{optimisticNetVotes}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton component for resource cards
 */
function ResourceCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Placeholder for badges and resource type */}
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 bg-muted rounded-sm animate-pulse" />
              <div className="w-16 h-5 bg-muted rounded-sm animate-pulse" />
              <div className="w-20 h-5 bg-muted rounded-sm animate-pulse" />
            </div>
            {/* Placeholder for resource title */}
            <div className="h-6 bg-muted rounded-sm w-3/4 animate-pulse" />
          </div>
          {/* Placeholder for voting section */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-muted rounded-sm animate-pulse" />
            <div className="w-6 h-4 bg-muted rounded-sm animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Placeholder for resource description */}
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded-sm w-full animate-pulse" />
            <div className="h-4 bg-muted rounded-sm w-3/4 animate-pulse" />
          </div>
          {/* Placeholder for metadata and action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-3 bg-muted rounded-sm w-16 animate-pulse" />
              <div className="h-3 bg-muted rounded-sm w-12 animate-pulse" />
              <div className="h-3 bg-muted rounded-sm w-20 animate-pulse" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-muted rounded-sm animate-pulse" />
              <div className="w-6 h-6 bg-muted rounded-sm animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main client component for displaying resources within a specific topic
 */
export default function TopicPageClient({ params }: TopicPageClientProps) {
  // Extract topic name from URL parameters
  const { topic: topicName } = use(params);

  // Local state for filtering and search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");

  // Track if this is the initial load to prevent skeleton flash
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [previousResources, setPreviousResources] = useState<Resource[] | null>(null);

  const { member } = useCurrentMember();

  // Fetch topic data by name from URL
  const { data: topic, isLoading: topicLoading } = useTopicByName(topicName);

  // Fetch filtered and sorted resources for this topic
  const { data: resourcesData, isLoading: resourcesLoading } = useResources({
    topicSlug: topicName,
    sortBy,
    searchTerm: searchTerm.trim() || undefined,
  });

  // Determine which resources to display
  const displayResources = resourcesData?.items;

  // Track when we receive resources to manage loading states
  useEffect(() => {
    if (displayResources !== undefined) {
      setIsInitialLoad(false);
      setPreviousResources(displayResources);
    }
  }, [displayResources]);

  // Loading state while topic data is being fetched
  if (topicLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page header skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              {/* Topic title skeleton */}
              <div className="flex items-center mb-2">
                <div className="w-12 h-12 bg-muted rounded-sm animate-pulse mr-3" />
                <div className="h-9 bg-muted rounded-sm w-64 animate-pulse" />
              </div>
              {/* Description skeleton */}
              <div className="h-5 bg-muted rounded-sm w-96 animate-pulse mb-2" />
              {/* Resource count skeleton */}
              <div className="h-4 bg-muted rounded-sm w-32 animate-pulse mt-2" />
            </div>
            {/* Add resource button skeleton */}
            <div className="w-32 h-10 bg-muted rounded-sm animate-pulse" />
          </div>

          {/* Search and filters skeleton */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search input skeleton */}
            <div className="flex-1 h-10 bg-muted rounded-sm animate-pulse" />

            {/* Filter controls skeleton */}
            <div className="flex items-center space-x-2">
              <div className="w-32 h-10 bg-muted rounded-sm animate-pulse" />
              <div className="w-32 h-10 bg-muted rounded-sm animate-pulse" />
              <div className="w-32 h-10 bg-muted rounded-sm animate-pulse" />
              <div className="w-32 h-10 bg-muted rounded-sm animate-pulse" />
            </div>
          </div>
        </div>

        {/* Resources grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state when topic doesn't exist
  if (topic === null) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Topic Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The topic &quot;{topicName}&quot; doesn&apos;t exist or is not available.
          </p>
          <Button asChild>
            <Link href="/educate">Browse All Topics</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page header with topic information and actions */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            {topic?.icon && <span>{topic.icon}</span>}
            {topic?.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">{topic?.resourceCount} resources</p>
        </div>

        {/* Search and filter controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search input with icon */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Single filter control */}
          <Select value={sortBy} onValueChange={(value: "newest" | "popular") => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayResources === undefined ? (
          // Only show skeleton on initial load or if we had previous results
          isInitialLoad || (previousResources && previousResources.length > 0) ? (
            Array.from({ length: 6 }, (_, i) => <ResourceCardSkeleton key={i} />)
          ) : (
            // Show empty state immediately if we know there were no previous results
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm.trim() ? "No resources found" : "No resources available"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm.trim()
                  ? "Try adjusting your search terms or filters"
                  : `Be the first to add a ${topic?.displayName} resource!`}
              </p>
              {member && (
                <Button asChild>
                  <Link href={`/educate/${topicName}/submit`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Resource
                  </Link>
                </Button>
              )}
            </div>
          )
        ) : displayResources.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm.trim() ? "No resources found" : "No resources available"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm.trim()
                ? "Try adjusting your search terms or filters"
                : `Be the first to add a ${topic?.displayName} resource!`}
            </p>
            {member && (
              <Button asChild>
                <Link href={`/educate/${topicName}/submit`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Resource
                </Link>
              </Button>
            )}
          </div>
        ) : (
          displayResources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)
        )}
      </div>
    </div>
  );
}
