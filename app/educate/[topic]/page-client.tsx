"use client";
import React, { useState, use } from "react";
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
  Search, 
  Plus, 
  ExternalLink, 
  ArrowUpIcon, 
  BookOpen,
  Filter,
  SortAsc,
  Eye,
  User,
  Calendar
} from "lucide-react";
import { Authenticated, Unauthenticated } from "convex/react";
import { BookmarkButton } from "@/components/bookmark-button";
import { Id } from "@/convex/_generated/dataModel";

interface TopicPageClientProps {
  params: Promise<{
    topic: string;
  }>;
}

interface Resource {
  _id: Id<"resources">;
  title: string;
  description: string;
  url: string;
  type: "article" | "video" | "course" | "documentation" | "tool" | "book" | "other";
  difficulty?: "beginner" | "intermediate" | "advanced";
  isPaid: boolean;
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

function ResourceCard({ resource }: { resource: Resource }) {
  const voteOnResource = useMutation(api.votes.voteOnResource);
  const trackResourceView = useMutation(api.resources.trackResourceView);
  const userVote = useQuery(api.votes.getUserVote, {
    targetId: resource._id,
    targetType: "resource",
  });
  const [isVoting, setIsVoting] = useState(false);
  const [optimisticNetVotes, setOptimisticNetVotes] = useState(resource.netVotes);
  const [optimisticUserVote, setOptimisticUserVote] = useState<string | null>(null);

  const currentUserVote = optimisticUserVote !== null ? optimisticUserVote : userVote;

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isVoting) return;
    setIsVoting(true);

    const voteType = currentUserVote === "upvote" ? "remove" : "upvote";
    let newNetVotes = optimisticNetVotes;
    let newUserVote: string | null = null;

    if (voteType === "upvote") {
      newNetVotes = optimisticNetVotes + (currentUserVote === null ? 1 : 1);
      newUserVote = "upvote";
    } else {
      newNetVotes = optimisticNetVotes - 1;
      newUserVote = null;
    }

    setOptimisticNetVotes(newNetVotes);
    setOptimisticUserVote(newUserVote);

    try {
      const result = await voteOnResource({
        resourceId: resource._id,
        voteType,
      });
      setOptimisticNetVotes(result.netVotes);
      setOptimisticUserVote(result.newVoteType);
    } catch (error) {
      setOptimisticNetVotes(resource.netVotes);
      setOptimisticUserVote(userVote || null);
      console.error("Failed to vote:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleResourceClick = async () => {
    try {
      await trackResourceView({ resourceId: resource._id });
    } catch (error) {
      console.error("Failed to track resource view:", error);
    }
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

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
            </div>
            <CardTitle 
              className="text-lg cursor-pointer hover:text-blue-600 transition-colors"
              onClick={handleResourceClick}
            >
              {resource.title}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Authenticated>
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
              <Button variant="ghost" size="sm" className="p-1 h-auto" disabled>
                <ArrowUpIcon size={16} className="text-muted-foreground" />
              </Button>
            </Unauthenticated>
            <span className="text-sm font-medium">{optimisticNetVotes}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {resource.description}
        </p>
        
        <div className="flex items-center justify-between">
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
            >
              <ExternalLink size={12} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 bg-muted rounded animate-pulse" />
              <div className="w-16 h-5 bg-muted rounded animate-pulse" />
              <div className="w-20 h-5 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-6 bg-muted rounded w-3/4 animate-pulse" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            <div className="w-6 h-4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full animate-pulse" />
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
          </div>
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

export default function TopicPageClient({ params }: TopicPageClientProps) {
  const { topic: topicName } = use(params);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [paidFilter, setPaidFilter] = useState<string>("all");

  const topic = useQuery(api.topics.getTopicByName, { name: topicName });
  const resources = useQuery(
    api.resources.getResourcesByTopic,
    topic?._id ? {
      topicId: topic._id,
      sortBy,
      type: typeFilter === "all" ? undefined : typeFilter,
      difficulty: difficultyFilter === "all" ? undefined : difficultyFilter,
      isPaid: paidFilter === "paid" ? true : paidFilter === "free" ? false : undefined,
    } : "skip"
  );

  const searchResults = useQuery(
    api.resources.searchResources,
    searchTerm.trim() && topic?._id ? {
      searchTerm: searchTerm.trim(),
      topicId: topic._id,
    } : "skip"
  );

  const displayResources = searchTerm.trim() ? searchResults : resources;

  if (topic === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4" />
          <div className="h-4 bg-muted rounded w-2/3 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }, (_, i) => <ResourceCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              {topic.icon && <span className="mr-3 text-4xl">{topic.icon}</span>}
              {topic.displayName} Resources
            </h1>
            <p className="text-muted-foreground">
              {topic.description}
            </p>
            <div className="mt-2 text-sm text-muted-foreground">
              {topic.resourceCount} resources available
            </div>
          </div>
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
              <Button disabled>
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </Unauthenticated>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
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
          Array.from({ length: 6 }, (_, i) => <ResourceCardSkeleton key={i} />)
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
          displayResources.map((resource) => (
            <ResourceCard key={resource._id} resource={resource} />
          ))
        )}
      </div>
    </div>
  );
}
