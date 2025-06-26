"use client";

import MemberCard from "@/components/member-card";
import { MemberCardSkeletonGrid } from "@/components/member-skeleton";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { PageErrorBoundary } from "@/components/error-boundary";

function MembersPageContent() {
  // Search state management
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search term with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Conditional queries based on search state
  const allMembersData = useQuery(
    api.members.getAllMembers,
    debouncedSearchTerm ? "skip" : {}
  );

  const searchResults = useQuery(
    api.members.searchMembers,
    debouncedSearchTerm ? { searchTerm: debouncedSearchTerm } : "skip"
  );

  // Determine which data to display and loading states
  const membersData = debouncedSearchTerm ? searchResults : allMembersData;
  const isSearching = debouncedSearchTerm.length > 0;
  const isLoading = membersData === undefined;
  const hasSearchTerm = searchTerm.length > 0;
  const isTyping = searchTerm !== debouncedSearchTerm;

  // Transform server data to match MemberCard interface
  const members =
    membersData?.map((member) => ({
      id: member._id, // Convert _id to id for MemberCard
      firstName: member.firstName,
      lastName: member.lastName,
      status: member.status,
      joinedDate: member.joinedDateFormatted, // Use server-formatted date
      country: member.country,
      bio: member.bio,
      linkGithub: member.linkGithub,
      linkX: member.linkX,
      linkYouTube: member.linkYouTube,
      location: member.location,
    })) || [];

  // Clear search function
  const clearSearch = () => {
    setSearchTerm("");
  };

  // Initial loading state (no search term)
  if (isLoading && !hasSearchTerm) {
    return (
      <div className="font-mono min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Members Directory
            </h1>
            <p className="text-gray-600">
              Discover and connect with developers in the VAI community.
            </p>
          </div>

          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search members by name or location..."
                className="pl-12 py-3 text-md border-gray-300 focus:border-green-700 focus:ring-green-700"
                disabled
              />
            </div>
          </div>

          <MemberCardSkeletonGrid count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Members Directory
          </h1>
          <p className="text-gray-600">
            Discover and connect with developers in the VAI community.
          </p>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members by name or location..."
              className="pl-12 pr-10 py-3 text-md border-gray-300 focus:border-green-700 focus:ring-green-700"
            />
            {hasSearchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                {isTyping && (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                )}
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced search results info */}
        {isSearching && (
          <div className="mb-4 text-sm text-gray-600 flex items-center">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching for &ldquo;{debouncedSearchTerm}&rdquo;...
              </>
            ) : (
              <>
                {members.length > 0 ? (
                  `Found ${members.length} member${members.length === 1 ? '' : 's'} matching "${debouncedSearchTerm}"`
                ) : (
                  `No members found matching "${debouncedSearchTerm}"`
                )}
              </>
            )}
          </div>
        )}

        {/* Results grid with enhanced loading states */}
        {isLoading ? (
          <div className="transition-opacity duration-300">
            <MemberCardSkeletonGrid count={isSearching ? 3 : 6} />
          </div>
        ) : members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-300">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        ) : isSearching ? (
          <div className="text-center py-12 transition-opacity duration-300">
            <div className="text-gray-500 text-lg mb-2">No members found</div>
            <p className="text-gray-400">
              Try adjusting your search terms or{" "}
              <button
                onClick={clearSearch}
                className="text-green-700 hover:text-green-800 underline"
              >
                browse all members
              </button>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function MembersPage() {
  return (
    <PageErrorBoundary context="loading members directory">
      <MembersPageContent />
    </PageErrorBoundary>
  );
}
