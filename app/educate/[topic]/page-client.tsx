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
import React, { useState, use, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Search, 
  Plus, 
  ExternalLink, 
  ArrowUpIcon, 
  BookOpen,
  Filter,
  SortAsc,
  Eye,
  User,
  Calendar,
  Lock
} from "lucide-react";
import { Authenticated, Unauthenticated } from "convex/react";
import { BookmarkButton } from "@/components/bookmark-button";
import { Id } from "@/convex/_generated/dataModel";

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
 * Represents a learning resource with all its metadata and engagement data
 * 
 * @interface Resource
 * @property {Id<"resources">} _id - Unique identifier for the resource
 * @property {string} title - Resource title for display
 * @property {string} description - Detailed description of the resource content
 * @property {string} url - External URL where the resource is hosted
 * @property {string} type - Category of resource (article, video, course, etc.)
 * @property {string} [difficulty] - Optional difficulty level indicator
 * @property {boolean} isPaid - Whether the resource requires payment
 * @property {number} upvotes - Total number of upvotes (legacy field)
 * @property {number} netVotes - Net votes (upvotes - downvotes)
 * @property {number} viewCount - Number of times resource has been viewed
 * @property {number} createdAt - Timestamp when resource was created
 * @property {Object|null} member - Resource contributor information
 */
interface Resource {
  _id: Id<"resources">;
  title: string;
  description: string;
  url: string;
  type: "article" | "video" | "course" | "documentation" | "tool" | "book" | "other";
  difficulty?: "beginner" | "intermediate" | "advanced";
  isPaid: boolean;
  isFree?: boolean;
  upvotes: number;
  netVotes: number;
  viewCount: number;
  createdAt: number;
  member: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    username: string;
    slug: string;
  } | null;
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
 * 
 * @example
 * ```tsx
 * <ResourceCard resource={{
 *   _id: "resource123",
 *   title: "React Hooks Guide",
 *   description: "Complete guide to React hooks",
 *   url: "https://example.com/hooks",
 *   type: "article",
 *   difficulty: "intermediate",
 *   isPaid: false,
 *   netVotes: 25,
 *   viewCount: 150,
 *   createdAt: Date.now(),
 *   member: { ... }
 * }} />
 * ```
 */
function ResourceCard({ resource }: { resource: Resource }) {
  // Mutations for resource interactions
  const voteOnResource = useMutation(api.votes.voteOnResource);
  const trackResourceView = useMutation(api.resources.trackResourceView);
  
  // Query current user's vote status for this resource
  const userVote = useQuery(api.votes.getUserVote, {
    targetId: resource._id,
    targetType: "resource",
  });
  
  // Query if user can access this resource
  const canViewResource = useQuery(api.resources.canUserViewResource, {
    resourceId: resource._id,
  });
  
  // Local state for voting interactions and optimistic updates
  const [isVoting, setIsVoting] = useState(false);
  const [optimisticNetVotes, setOptimisticNetVotes] = useState(resource.netVotes);
  const [optimisticUserVote, setOptimisticUserVote] = useState<string | null>(null);

  // Use optimistic state if available, otherwise fall back to server state
  const currentUserVote = optimisticUserVote !== null ? optimisticUserVote : userVote;

  /**
   * Handles upvote button clicks with optimistic updates
   * 
   * Implements optimistic UI updates for immediate feedback, then syncs with
   * server state. If the vote fails, it reverts to the previous state.
   * Prevents event bubbling to avoid triggering card click handlers.
   * 
   * @param {React.MouseEvent} e - Mouse event from button click
   */
  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isVoting) return;
    setIsVoting(true);

    // Determine if this is an upvote or vote removal
    const voteType = currentUserVote === "upvote" ? "remove" : "upvote";
    let newNetVotes = optimisticNetVotes;
    let newUserVote: string | null = null;

    // Calculate optimistic vote counts
    if (voteType === "upvote") {
      // Add vote (regardless of previous state, we increment by 1)
      newNetVotes = optimisticNetVotes + (currentUserVote === null ? 1 : 1);
      newUserVote = "upvote";
    } else {
      // Remove existing upvote
      newNetVotes = optimisticNetVotes - 1;
      newUserVote = null;
    }

    // Apply optimistic updates immediately for responsive UI
    setOptimisticNetVotes(newNetVotes);
    setOptimisticUserVote(newUserVote);

    try {
      // Sync with server and get actual vote counts
      const result = await voteOnResource({
        resourceId: resource._id,
        voteType,
      });
      // Update with server-confirmed values
      setOptimisticNetVotes(result.netVotes);
      setOptimisticUserVote(result.newVoteType);
    } catch (error) {
      // Revert optimistic updates on error
      setOptimisticNetVotes(resource.netVotes);
      setOptimisticUserVote(userVote || null);
      console.error("Failed to vote:", error);
    } finally {
      setIsVoting(false);
    }
  };

  /**
   * Handles resource link clicks with view tracking
   * 
   * Tracks when users click to view a resource for analytics purposes,
   * then opens the resource in a new tab with security attributes.
   * View tracking failures are logged but don't prevent navigation.
   * Checks access permissions before allowing navigation.
   */
  const handleResourceClick = async () => {
    // Check if user has access to this resource
    if (canViewResource === false) {
      // TODO: Show upgrade modal or redirect to paywall
      console.log("Access denied: Premium resource");
      return;
    }
    
    try {
      // Track view for analytics (fire-and-forget)
      await trackResourceView({ resourceId: resource._id });
    } catch (error) {
      console.error("Failed to track resource view:", error);
    }
    // Open resource in new tab with security attributes
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  /**
   * Returns appropriate emoji icon for resource type
   * 
   * @param {string} type - Resource type identifier
   * @returns {string} Emoji icon representing the resource type
   */
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return "🎥";
      case "course": return "🎓";
      case "book": return "📚";
      case "tool": return "🔧";
      case "documentation": return "📖";
      default: return "📄";
    }
  };

  /**
   * Returns appropriate CSS classes for difficulty level badges
   * 
   * @param {string} [difficulty] - Optional difficulty level
   * @returns {string} CSS classes for styling difficulty badges
   */
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-800";
      case "intermediate": return "bg-yellow-100 text-yellow-800";
      case "advanced": return "bg-red-100 text-red-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Resource type, difficulty, and payment status badges */}
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{getTypeIcon(resource.type)}</span>
              <Badge variant="secondary" className="text-xs">
                {resource.type}
              </Badge>
              {resource.difficulty && (
                <Badge className={`text-xs ${getDifficultyColor(resource.difficulty)}`}>
                  {resource.difficulty}
                </Badge>
              )}
              {resource.isPaid && (
                <Badge variant="outline" className="text-xs">
                  Paid
                </Badge>
              )}
              {resource.isFree && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                  Free
                </Badge>
              )}
            </div>
            {/* Clickable resource title */}
            <CardTitle 
              className={`text-lg cursor-pointer transition-colors flex items-center gap-2 ${
                canViewResource === false ? 'hover:text-muted-foreground' : 'hover:text-blue-600'
              }`}
              onClick={handleResourceClick}
            >
              {resource.title}
              {canViewResource === false && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Premium resource - Upgrade to access</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
          </div>
          {/* Voting section with authentication handling */}
          <div className="flex items-center space-x-2">
            <Authenticated>
              {/* Authenticated users can vote */}
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
                onClick={handleUpvote}
                disabled={isVoting}
              >
                <ArrowUpIcon
                  size={16}
                  className={`transition-colors ${
                    currentUserVote === "upvote"
                      ? "text-orange-500"
                      : "text-muted-foreground hover:text-orange-500"
                  }`}
                />
              </Button>
            </Authenticated>
            <Unauthenticated>
              {/* Unauthenticated users see disabled vote button */}
              <Button variant="ghost" size="sm" className="p-1 h-auto" disabled>
                <ArrowUpIcon size={16} className="text-muted-foreground" />
              </Button>
            </Unauthenticated>
            {/* Display current vote count */}
            <span className="text-sm font-medium">{optimisticNetVotes}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Resource description with text truncation */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {resource.description}
        </p>
        
        <div className="flex items-center justify-between">
          {/* Resource metadata and engagement stats */}
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            {resource.member && (
              <div className="flex items-center space-x-1">
                <User size={12} />
                <span>{resource.member.firstName} {resource.member.lastName}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Eye size={12} />
              <span>{resource.viewCount} views</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar size={12} />
              <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          {/* Action buttons for bookmarking and external navigation */}
          <div className="flex items-center space-x-2">
            <BookmarkButton 
              targetId={resource._id} 
              targetType="resource" 
              size="sm" 
            />
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-auto"
              onClick={handleResourceClick}
              disabled={canViewResource === false}
            >
              {canViewResource === false ? (
                <Lock size={12} />
              ) : (
                <ExternalLink size={12} />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton component for resource cards
 * 
 * Displays animated placeholder content while resource data is being fetched.
 * Maintains the same layout structure as ResourceCard to prevent layout shifts
 * during loading transitions. Shows placeholders for all interactive elements.
 * 
 * @returns {JSX.Element} Rendered skeleton loading component
 * 
 * @example
 * ```tsx
 * {isLoading && (
 *   <div className="grid grid-cols-3 gap-4">
 *     {Array.from({ length: 6 }, (_, i) => (
 *       <ResourceCardSkeleton key={i} />
 *     ))}
 *   </div>
 * )}
 * ```
 */
function ResourceCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Placeholder for badges and resource type */}
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 bg-muted rounded animate-pulse" />
              <div className="w-16 h-5 bg-muted rounded animate-pulse" />
              <div className="w-20 h-5 bg-muted rounded animate-pulse" />
            </div>
            {/* Placeholder for resource title */}
            <div className="h-6 bg-muted rounded w-3/4 animate-pulse" />
          </div>
          {/* Placeholder for voting section */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            <div className="w-6 h-4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Placeholder for resource description */}
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full animate-pulse" />
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
          </div>
          {/* Placeholder for metadata and action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-3 bg-muted rounded w-16 animate-pulse" />
              <div className="h-3 bg-muted rounded w-12 animate-pulse" />
              <div className="h-3 bg-muted rounded w-20 animate-pulse" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-muted rounded animate-pulse" />
              <div className="w-6 h-6 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main client component for displaying resources within a specific topic
 * 
 * This component handles the complete user experience for browsing learning
 * resources within a topic, including filtering, sorting, searching, and
 * interacting with individual resources. It manages complex state for all
 * filter combinations and provides real-time search capabilities.
 * 
 * State management includes:
 * - Search functionality across resource titles and descriptions
 * - Filtering by resource type, difficulty level, and payment status
 * - Sorting by creation date (newest) or popularity (votes)
 * - Authentication-based UI variations
 * - Loading and error states
 * 
 * @param {TopicPageClientProps} props - Component props
 * @returns {JSX.Element} Complete topic page with resources
 * 
 * @example
 * ```tsx
 * // Used via Next.js routing: /educate/react
 * <TopicPageClient params={Promise.resolve({ topic: "react" })} />
 * ```
 */
export default function TopicPageClient({ params }: TopicPageClientProps) {
  // Extract topic name from URL parameters
  const { topic: topicName } = use(params);
  
  // Local state for filtering and search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [paidFilter, setPaidFilter] = useState<string>("all");
  
  // Track if this is the initial load to prevent skeleton flash
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [previousResources, setPreviousResources] = useState<Resource[] | null>(null);

  // Fetch topic data by name from URL
  const topic = useQuery(api.topics.getTopicByName, { name: topicName });
  
  // Fetch filtered and sorted resources for this topic
  const resources = useQuery(
    api.resources.getResourcesByTopic,
    topic?._id ? {
      topicId: topic._id,
      sortBy,
      // Convert "all" filter values to undefined for API
      type: typeFilter === "all" ? undefined : typeFilter,
      difficulty: difficultyFilter === "all" ? undefined : difficultyFilter,
      isPaid: paidFilter === "paid" ? true : paidFilter === "free" ? false : undefined,
    } : "skip"
  );

  // Fetch search results when user searches within this topic
  const searchResults = useQuery(
    api.resources.searchResources,
    searchTerm.trim() && topic?._id ? {
      searchTerm: searchTerm.trim(),
      topicId: topic._id,
    } : "skip"
  );

  // Determine which resources to display based on search state
  const displayResources = searchTerm.trim() ? searchResults : resources;
  
  // Track when we receive resources to manage loading states
  useEffect(() => {
    if (displayResources !== undefined) {
      setIsInitialLoad(false);
      setPreviousResources(displayResources);
    }
  }, [displayResources]);

  // Loading state while topic data is being fetched
  if (topic === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page header skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              {/* Topic title skeleton */}
              <div className="flex items-center mb-2">
                <div className="w-12 h-12 bg-muted rounded animate-pulse mr-3" />
                <div className="h-9 bg-muted rounded w-64 animate-pulse" />
              </div>
              {/* Description skeleton */}
              <div className="h-5 bg-muted rounded w-96 animate-pulse mb-2" />
              {/* Resource count skeleton */}
              <div className="h-4 bg-muted rounded w-32 animate-pulse mt-2" />
            </div>
            {/* Add resource button skeleton */}
            <div className="w-32 h-10 bg-muted rounded animate-pulse" />
          </div>

          {/* Search and filters skeleton */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search input skeleton */}
            <div className="flex-1 h-10 bg-muted rounded animate-pulse" />
            
            {/* Filter controls skeleton */}
            <div className="flex items-center space-x-2">
              <div className="w-32 h-10 bg-muted rounded animate-pulse" />
              <div className="w-32 h-10 bg-muted rounded animate-pulse" />
              <div className="w-32 h-10 bg-muted rounded animate-pulse" />
              <div className="w-32 h-10 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Resources grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => <ResourceCardSkeleton key={i} />)}
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
        <div className="flex items-center justify-between mb-4">
          <div>
            {/* Topic title with optional icon */}
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              {topic.icon && <span className="mr-3 text-4xl">{topic.icon}</span>}
              {topic.displayName} Resources
            </h1>
            <p className="text-muted-foreground">
              {topic.description}
            </p>
            {/* Resource count for quick reference */}
            <div className="mt-2 text-sm text-muted-foreground">
              {topic.resourceCount} resources available
            </div>
          </div>
          {/* Authentication-conditional add resource button */}
          <div className="flex items-center space-x-2">
            <Authenticated>
              <Button asChild>
                <Link href={`/educate/${topicName}/submit`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Resource
                </Link>
              </Button>
            </Authenticated>
            <Unauthenticated>
              {/* Disabled button serves as login CTA */}
              <Button disabled>
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </Unauthenticated>
          </div>
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
          
          {/* Filter and sort controls */}
          <div className="flex items-center space-x-2">
            <Select value={sortBy} onValueChange={(value: "newest" | "popular") => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SortAsc className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="documentation">Docs</SelectItem>
                <SelectItem value="tool">Tool</SelectItem>
                <SelectItem value="book">Book</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paidFilter} onValueChange={setPaidFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                  : `Be the first to add a ${topic.displayName} resource!`}
              </p>
              <Authenticated>
                <Button asChild>
                  <Link href={`/educate/${topicName}/submit`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Resource
                  </Link>
                </Button>
              </Authenticated>
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
                : `Be the first to add a ${topic.displayName} resource!`}
            </p>
            <Authenticated>
              <Button asChild>
                <Link href={`/educate/${topicName}/submit`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Resource
                </Link>
              </Button>
            </Authenticated>
          </div>
        ) : (
          displayResources.map((resource: Resource) => (
            <ResourceCard key={resource._id} resource={resource} />
          ))
        )}
      </div>
    </div>
  );
}
