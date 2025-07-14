"use client";

import React, { useState, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TierBadge } from "@/components/icons/tier-badge";
import { MemberHoverCardWrapper } from "@/components/members/member-hover-card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memberProfileUrl } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

type SortField = "name" | "joinedDate" | "posts" | "tier";
type SortDirection = "asc" | "desc";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  status: "active" | "churned" | "free";
  joinedDate: string;
  country: string;
  bio: string;
  linkGithub?: string;
  linkX?: string;
  linkYouTube?: string;
  location?: string;
  avatarUrl?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  skills?: string[];
  postCount?: number;
  commentCount?: number;
  netVoteCount?: number;
  slug?: string;
  tier?: "free" | "scholarship" | "founding_member" | "early_bird" | "member";
}

interface MembersDisplayProps {
  members: Member[];
  isLoading?: boolean;
}


// Loading skeleton for table view
function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Tier</TableHead>
          <TableHead>Posts</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-24 animate-pulse" />
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="h-5 bg-muted rounded w-20 animate-pulse" />
            </TableCell>
            <TableCell>
              <div className="h-4 bg-muted rounded w-12 animate-pulse" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function MembersDisplay({ members, isLoading }: MembersDisplayProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const router = useRouter();

  // Sort members based on current sort field and direction
  // Memoize the sorted array to prevent re-sorting on every render
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "name":
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "joinedDate":
          aValue = new Date(a.joinedDate).getTime();
          bValue = new Date(b.joinedDate).getTime();
          break;
        case "posts":
          aValue = a.postCount || 0;
          bValue = b.postCount || 0;
          break;
        case "tier":
          const tierOrder = { 
            founding_member: 0, 
            early_bird: 1, 
            member: 2, 
            scholarship: 3, 
            free: 4 
          };
          aValue = tierOrder[a.tier || "free"];
          bValue = tierOrder[b.tier || "free"];
          break;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [members, sortField, sortDirection]);

  // Handle sort column click - memoized to prevent recreation on every render
  const handleSort = React.useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField, sortDirection]);

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3 ml-1 inline" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1 inline" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Member count */}
      <div className="text-sm text-muted-foreground mb-2">
        {members.length} {members.length === 1 ? 'member' : 'members'}
      </div>

      {/* Display Content */}
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="border border-border/50 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead 
                  className="cursor-pointer hover:text-foreground font-medium"
                  onClick={() => handleSort("name")}
                >
                  Member
                  <SortIndicator field="name" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground font-medium"
                  onClick={() => handleSort("tier")}
                >
                  Tier
                  <SortIndicator field="tier" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground font-medium"
                  onClick={() => handleSort("posts")}
                >
                  Posts
                  <SortIndicator field="posts" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMembers.map((member) => {
                const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
                const memberUrl = memberProfileUrl({ 
                  slug: member.slug!, 
                  _id: member.id as Id<"members"> 
                });

                return (
                  <TableRow 
                    key={member.id} 
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={(e) => {
                      // Only navigate if the click wasn't on a button or link
                      const target = e.target as HTMLElement;
                      if (!target.closest('button') && !target.closest('a')) {
                        router.push(memberUrl);
                      }
                    }}
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <MemberHoverCardWrapper member={{
                          _id: member.id as Id<"members">,
                          firstName: member.firstName,
                          lastName: member.lastName,
                          slug: member.slug,
                          avatarUrl: member.avatarUrl
                        }}>
                          <Avatar className="h-9 w-9 cursor-pointer ring-1 ring-border/50">
                            <AvatarImage src={member.avatarUrl || ""} />
                            <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
                          </Avatar>
                        </MemberHoverCardWrapper>
                        <div>
                          <Link 
                            href={memberUrl} 
                            className="font-medium text-sm hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {member.firstName} {member.lastName}
                          </Link>
                          {member.location && (
                            <div className="text-xs text-muted-foreground mt-0.5">{member.location}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {member.tier && member.tier !== "free" ? (
                        <TierBadge tier={member.tier} size="sm" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Free</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm">{member.postCount || 0}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && members.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No members found</p>
        </div>
      )}
    </div>
  );
}