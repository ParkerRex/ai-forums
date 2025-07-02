"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { BookOpen, Users, TrendingUp, Search, Plus } from "lucide-react";
import { useState } from "react";
import { Authenticated, Unauthenticated } from "convex/react";

interface Topic {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  resourceCount: number;
  createdAt: number;
  updatedAt: number;
  status: "active" | "inactive";
}

function TopicCard({ topic }: { topic: Topic }) {
  return (
    <Link href={`/educate/${topic.name}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {topic.icon && <span className="text-2xl">{topic.icon}</span>}
              <CardTitle className="text-lg">{topic.displayName}</CardTitle>
            </div>
            <div className="text-sm text-muted-foreground">
              {topic.resourceCount} resources
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {topic.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function TopicCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            <div className="h-5 bg-muted rounded w-24 animate-pulse" />
          </div>
          <div className="h-4 bg-muted rounded w-16 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full animate-pulse" />
          <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function EducatePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const topics = useQuery(api.topics.getTopics, {});
  const searchResults = useQuery(
    api.topics.searchTopics,
    searchTerm.trim() ? { searchTerm: searchTerm.trim() } : "skip"
  );

  const displayTopics = searchTerm.trim() ? searchResults : topics;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Learning Resources</h1>
            <p className="text-muted-foreground">
              Discover curated learning resources organized by technology and topic.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Authenticated>
              <Button asChild>
                <Link href="/educate/submit">
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

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayTopics === undefined ? (
          Array.from({ length: 6 }, (_, i) => <TopicCardSkeleton key={i} />)
        ) : displayTopics.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm.trim() ? "No topics found" : "No topics available"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm.trim()
                ? "Try adjusting your search terms"
                : "Topics will appear here as they are added"}
            </p>
          </div>
        ) : (
          displayTopics.map((topic: Topic) => <TopicCard key={topic._id} topic={topic} />)
        )}
      </div>

      {!searchTerm.trim() && topics && topics.length > 0 && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Total Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {topics.reduce((sum: number, topic: Topic) => sum + topic.resourceCount, 0)}
              </div>
              <p className="text-sm text-muted-foreground">
                Across all topics
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Active Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topics.length}</div>
              <p className="text-sm text-muted-foreground">
                Technologies covered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Community Driven
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
              <p className="text-sm text-muted-foreground">
                Curated by members
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
