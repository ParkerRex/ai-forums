"use client";

/**
 * @fileoverview Members Directory Page - Main landing page for browsing and searching community members
 * 
 * This page provides a comprehensive member directory with real-time search capabilities,
 * member statistics, and responsive grid layout. It implements debounced search to minimize
 * API calls while providing instant feedback to users.
 * 
 * Features:
 * - Real-time member search with 300ms debounce
 * - Responsive grid layout (1-3 columns based on screen size)
 * - Loading states and skeleton screens
 * - Member statistics (posts, comments, votes)
 * - Progressive loading for better UX
 * - Error boundary protection
 * 
 * @author VAI Development Team
 * @version 1.0.0
 */

import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { PageErrorBoundary } from "@/components/error-boundary";
import MembersDisplay from "@/components/members/members-display";

/**
 * Main content component for the Members Directory page.
 * 
 * Handles member search, filtering, and display logic with optimized loading states.
 * Uses separate queries for search and browse modes to minimize unnecessary API calls.
 * 
 * @component
 * @returns {JSX.Element} The members directory content with search and member grid
 * 
 * @example
 * ```tsx
 * // Used internally by the main MembersPage component
 * <MembersPageContent />
 * ```
 */
function MembersPageContent() {
  // Search state management - separate states for immediate UI feedback and debounced API calls
  const [searchTerm, setSearchTerm] = useState(""); // Immediate search input value
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(""); // Debounced value for API calls

  // Debounce search term with 300ms delay to prevent excessive API calls
  // This provides a balance between responsive UI and API efficiency
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay is optimal for search UX

    // Cleanup timeout on component unmount or searchTerm change
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Conditional queries based on search state - only run one query at a time
  // This optimization prevents unnecessary API calls and improves performance
  const allMembersData = useQuery(
    api.members.getMembersWithStats,
    debouncedSearchTerm ? "skip" : {} // Skip when searching to avoid duplicate calls
  );

  // Search-specific query that only runs when there's a search term
  const searchResults = useQuery(
    api.members.searchMembersWithStats,
    debouncedSearchTerm ? { searchTerm: debouncedSearchTerm } : "skip"
  );

  // Determine which data to display and calculate various loading states
  // These states help provide granular loading feedback to users
  const membersData = debouncedSearchTerm ? searchResults : allMembersData;
  const isSearching = debouncedSearchTerm.length > 0; // True when actively searching
  const isLoading = membersData === undefined; // True when waiting for API response
  const hasSearchTerm = searchTerm.length > 0; // True when user has typed something
  const isTyping = searchTerm !== debouncedSearchTerm; // True during debounce period

  // Transform server data to match MembersDisplay interface
  // This transformation layer allows us to adapt server data structure to component needs
  const members =
    membersData?.map((member) => ({
      id: member._id, // Convert Convex _id to generic id for component
      firstName: member.firstName,
      lastName: member.lastName,
      status: member.status, // Member status: active, churned, or free
      joinedDate: member.joinedDateFormatted, // Use server-formatted date for consistency
      country: member.country,
      bio: member.bio,
      linkGithub: member.linkGithub,
      linkX: member.linkX,
      linkYouTube: member.linkYouTube,
      location: member.location,
      // Enhanced profile fields for member upgrades
      avatarUrl: member.avatarUrl,
      websiteUrl: member.websiteUrl,
      linkedinUrl: member.linkedinUrl,
      skills: member.skills, // Array of member skills/technologies
      // Community engagement statistics
      postCount: member.postCount,
      commentCount: member.commentCount,
      netVoteCount: member.netVoteCount,
      // URL slug for member profile routing
      slug: member.slug,
      // Membership tier for badges
      tier: member.tier,
    })) || [];

  // Clear search function - resets both immediate and debounced search states
  // This ensures a clean state reset when users want to browse all members
  const clearSearch = () => {
    setSearchTerm(""); // Clear immediate search term (debounced term will follow)
  };

  // Initial loading state (no search term) - shows skeleton grid while loading all members
  // This prevents layout shift and provides immediate visual feedback
  if (isLoading && !hasSearchTerm) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-10">
          {/* Page header with title and description */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Members Directory
            </h1>
            <p className="text-muted-foreground">
              Discover and connect with developers in the VAI community.
            </p>
          </div>

          {/* Search input - disabled during initial load */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search members by name or location..."
                className="pl-12 py-3 text-md"
                disabled // Disabled during initial load to prevent interaction
              />
            </div>
          </div>

          {/* Skeleton grid showing for initial load */}
          <MembersDisplay members={[]} isLoading={true} />
        </div>
      </div>
    );
  }

  // Main render - interactive members directory with search functionality
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Page header - consistent across all states */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Members Directory
          </h1>
          <p className="text-muted-foreground">
            Discover and connect with developers in the VAI community.
          </p>
        </div>

        {/* Search input with enhanced UX features */}
        <div className="mb-8">
          <div className="relative">
            {/* Search icon - positioned absolutely for consistent placement */}
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members by name or location..."
              className="pl-12 pr-10 py-3 text-md" // Padding for icons
            />
            {/* Search actions - clear button and loading indicator */}
            {hasSearchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                {/* Show loading spinner during debounce period */}
                {isTyping && (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                )}
                {/* Clear search button */}
                <button
                  onClick={clearSearch}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced search results info - only shown when actively searching */}
        {isSearching && (
          <div className="mb-4 text-sm text-muted-foreground flex items-center">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching for &ldquo;{debouncedSearchTerm}&rdquo;...
              </>
            ) : (
              <>
                {/* Dynamic result count with proper pluralization */}
                {members.length > 0 ? (
                  `Found ${members.length} member${members.length === 1 ? '' : 's'} matching "${debouncedSearchTerm}"`
                ) : (
                  `No members found matching "${debouncedSearchTerm}"`
                )}
              </>
            )}
          </div>
        )}

        {/* Results display with both grid and table views */}
        <MembersDisplay members={members} isLoading={isLoading} />
        
        {/* Empty search state */}
        {!isLoading && members.length === 0 && isSearching && (
          <div className="text-center py-12 transition-opacity duration-300">
            <div className="text-muted-foreground text-lg mb-2">No members found</div>
            <p className="text-muted-foreground/70">
              Try adjusting your search terms or{" "}
              <button
                onClick={clearSearch}
                className="text-primary hover:text-primary/80 underline"
              >
                browse all members
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main Members Directory Page component with error boundary protection.
 * 
 * This is the default export that wraps the main content in an error boundary
 * to gracefully handle any errors that occur during member loading or rendering.
 * 
 * @component
 * @returns {JSX.Element} The complete members page with error handling
 * 
 * @example
 * ```tsx
 * // Used in Next.js routing
 * // app/members/page.tsx
 * export default function MembersPage() { ... }
 * ```
 */
export default function MembersPage() {
  return (
    <PageErrorBoundary context="loading members directory">
      <MembersPageContent />
    </PageErrorBoundary>
  );
}
