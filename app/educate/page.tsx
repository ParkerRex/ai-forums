/**
 * @fileoverview Main education hub page component that displays learning topics and resources
 * 
 * This page serves as the central hub for the educational content platform, displaying
 * all available learning topics in a searchable grid layout. Users can browse topics,
 * search for specific technologies, and access statistics about the learning content.
 * 
 * Features:
 * - Grid display of all available learning topics
 * - Real-time search functionality across topics
 * - Authentication-based resource addition
 * - Community statistics and engagement metrics
 * - Responsive design for all device sizes
 * 
 * @author VAI Community
 * @version 1.0.0
 */

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

/**
 * Represents a learning topic with its metadata and resource count
 * 
 * @interface Topic
 * @property {string} _id - Unique identifier for the topic
 * @property {string} name - URL-friendly name used in routing
 * @property {string} displayName - Human-readable name shown in UI
 * @property {string} description - Brief description of the topic's content
 * @property {string} [icon] - Optional emoji or icon for visual representation
 * @property {number} resourceCount - Total number of resources in this topic
 * @property {number} createdAt - Timestamp when topic was created
 * @property {number} updatedAt - Timestamp when topic was last modified
 * @property {"active" | "inactive"} status - Current visibility status
 */
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

/**
 * Individual topic card component that displays a single learning topic
 * 
 * Renders a clickable card that shows topic information including name, icon,
 * description, and resource count. The card has hover effects and links to
 * the topic's dedicated page where users can browse all resources.
 * 
 * @param {Object} props - Component properties
 * @param {Topic} props.topic - The topic data to display
 * @returns {JSX.Element} Rendered topic card component
 * 
 * @example
 * ```tsx
 * <TopicCard topic={{
 *   _id: "123",
 *   name: "react",
 *   displayName: "React",
 *   description: "JavaScript library for building user interfaces",
 *   icon: "⚛️",
 *   resourceCount: 42,
 *   createdAt: Date.now(),
 *   updatedAt: Date.now(),
 *   status: "active"
 * }} />
 * ```
 */
function TopicCard({ topic }: { topic: Topic }) {
  return (
    <Link href={`/educate/${topic.name}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Display topic icon if available */}
              {topic.icon && <span className="text-2xl">{topic.icon}</span>}
              <CardTitle className="text-lg">{topic.displayName}</CardTitle>
            </div>
            {/* Show resource count for quick reference */}
            <div className="text-sm text-muted-foreground">
              {topic.resourceCount} resources
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Truncate description to maintain consistent card heights */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {topic.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * Loading skeleton component for topic cards
 * 
 * Displays animated placeholder content while topic data is being fetched
 * from the server. Maintains the same layout as TopicCard to prevent
 * layout shifts during loading states.
 * 
 * @returns {JSX.Element} Rendered skeleton loading component
 * 
 * @example
 * ```tsx
 * {isLoading && (
 *   <div className="grid grid-cols-3 gap-4">
 *     {Array.from({ length: 6 }, (_, i) => (
 *       <TopicCardSkeleton key={i} />
 *     ))}
 *   </div>
 * )}
 * ```
 */
function TopicCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Placeholder for topic icon */}
            <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            {/* Placeholder for topic name */}
            <div className="h-5 bg-muted rounded w-24 animate-pulse" />
          </div>
          {/* Placeholder for resource count */}
          <div className="h-4 bg-muted rounded w-16 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Placeholder for topic description */}
          <div className="h-4 bg-muted rounded w-full animate-pulse" />
          <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main education page component that serves as the learning hub
 * 
 * This is the primary entry point for the education platform, providing users
 * with access to all learning topics, search functionality, and community
 * statistics. It handles both authenticated and unauthenticated states,
 * showing appropriate UI elements based on user login status.
 * 
 * Key features:
 * - Displays all available learning topics in a responsive grid
 * - Real-time search across topic names and descriptions
 * - Authentication-gated "Add Resource" functionality
 * - Community statistics showing total resources and topics
 * - Loading states with skeleton components
 * - Empty states for no topics or search results
 * 
 * @returns {JSX.Element} The complete education hub page
 * 
 * @example
 * ```tsx
 * // This component is used as a Next.js page
 * // app/educate/page.tsx
 * export default function Page() {
 *   return <EducatePage />;
 * }
 * ```
 */
export default function EducatePage() {
  // Local state for managing search functionality
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch all topics from the database
  const topics = useQuery(api.topics.getTopics, {});
  
  // Conditionally fetch search results when user enters search term
  const searchResults = useQuery(
    api.topics.searchTopics,
    searchTerm.trim() ? { searchTerm: searchTerm.trim() } : "skip"
  );

  // Determine which topics to display based on search state
  const displayTopics = searchTerm.trim() ? searchResults : topics;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page header with title, description, and action buttons */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Learning Resources</h1>
            <p className="text-muted-foreground">
              Discover curated learning resources organized by technology and topic.
            </p>
          </div>
          {/* Authentication-conditional action buttons */}
          <div className="flex items-center space-x-2">
            <Authenticated>
              {/* Authenticated users can add resources */}
              <Button asChild>
                <Link href="/educate/submit">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Resource
                </Link>
              </Button>
            </Authenticated>
            <Unauthenticated>
              {/* Unauthenticated users see disabled button as a CTA */}
              <Button disabled>
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </Unauthenticated>
          </div>
        </div>

        {/* Search input with icon */}
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

      {/* Responsive grid layout for topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayTopics === undefined ? (
          // Show loading skeletons while data is being fetched
          Array.from({ length: 6 }, (_, i) => <TopicCardSkeleton key={i} />)
        ) : displayTopics.length === 0 ? (
          // Show empty state with contextual messaging
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
          // Render topic cards when data is available
          displayTopics.map((topic: Topic) => <TopicCard key={topic._id} topic={topic} />)
        )}
      </div>

      {/* Community statistics section - only shown when not searching */}
      {!searchTerm.trim() && topics && topics.length > 0 && (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total resources across all topics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Total Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {/* Calculate total resources by summing from all topics */}
                {topics.reduce((sum: number, topic: Topic) => sum + topic.resourceCount, 0)}
              </div>
              <p className="text-sm text-muted-foreground">
                Across all topics
              </p>
            </CardContent>
          </Card>

          {/* Number of active topics */}
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

          {/* Community-driven messaging */}
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
