"use client";

import React, { useState, useEffect } from "react";
import { LayoutGrid, List, ChevronUp, ChevronDown, MessageCircle, ExternalLink } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/ui/tier-badge";
import { MemberHoverCardWrapper } from "@/components/member-hover-card";
import Link from "next/link";
import { memberProfileUrl } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type SortField = "name" | "joinedDate" | "lastActive" | "posts" | "tier";
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
  lastOnlineRelative?: string;
  slug?: string;
  tier?: "free" | "scholarship" | "founding_member" | "early_bird" | "member";
}

interface MembersDisplayProps {
  members: Member[];
  isLoading?: boolean;
}

// Minimal grid card component
function MemberGridCard({ member }: { member: Member }) {
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  const memberUrl = memberProfileUrl({ 
    slug: member.slug!, 
    _id: member.id as Id<"members"> 
  });

  return (
    <Link href={memberUrl} className="block group">
      <div className="bg-card/50 border border-border/40 rounded-xl p-5 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 h-full">
        <div className="flex items-center gap-3.5">
          <MemberHoverCardWrapper member={{
            _id: member.id as Id<"members">,
            firstName: member.firstName,
            lastName: member.lastName,
            slug: member.slug,
            avatarUrl: member.avatarUrl
          }}>
            <Avatar className="h-12 w-12 cursor-pointer ring-2 ring-background">
              <AvatarImage src={member.avatarUrl || ""} />
              <AvatarFallback className="text-sm bg-muted">{initials}</AvatarFallback>
            </Avatar>
          </MemberHoverCardWrapper>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
              {member.firstName} {member.lastName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {member.tier && member.tier !== "free" && (
                <TierBadge tier={member.tier} size="sm" />
              )}
              {member.location && (
                <span className="text-xs text-muted-foreground truncate">
                  {member.location}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>{member.postCount || 0} posts</span>
            <span>•</span>
            <span>{member.commentCount || 0} comments</span>
          </div>
          <span className="text-muted-foreground/70 text-[11px]">
            {member.lastOnlineRelative ? member.lastOnlineRelative : "Offline"}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Loading skeleton for grid view
function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-card/50 border border-border/40 rounded-xl p-5 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 bg-muted rounded-full ring-2 ring-background" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 bg-muted rounded w-12" />
              <div className="h-3 bg-muted rounded w-16" />
            </div>
            <div className="h-3 bg-muted rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  );
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
          <TableHead>Last Active</TableHead>
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
            <TableCell>
              <div className="h-4 bg-muted rounded w-16 animate-pulse" />
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function MembersDisplay({ members, isLoading }: MembersDisplayProps) {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem("members-view-preference");
    if (savedView === "table" || savedView === "grid") {
      setView(savedView);
    }
  }, []);

  // Save view preference to localStorage
  const handleViewChange = (newView: string) => {
    if (newView === "grid" || newView === "table") {
      setView(newView);
      localStorage.setItem("members-view-preference", newView);
    }
  };

  // Sort members based on current sort field and direction
  const sortedMembers = [...members].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case "name":
        aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
        bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case "joinedDate":
        aValue = new Date(a.joinedDate).getTime();
        bValue = new Date(b.joinedDate).getTime();
        break;
      case "lastActive":
        aValue = a.lastOnlineRelative || "zzz"; // Put offline members at the end
        bValue = b.lastOnlineRelative || "zzz";
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

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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
      {/* View Toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </div>
        <ToggleGroup 
          type="single" 
          value={view} 
          onValueChange={handleViewChange}
          className="bg-muted/50 p-0.5 rounded-lg"
        >
          <ToggleGroupItem 
            value="grid" 
            aria-label="Grid view"
            className="px-3 py-1.5 text-xs font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            Grid
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="table" 
            aria-label="Table view"
            className="px-3 py-1.5 text-xs font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
          >
            <List className="h-3.5 w-3.5 mr-1.5" />
            Table
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Display Content */}
      {isLoading ? (
        view === "grid" ? <GridSkeleton /> : <TableSkeleton />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedMembers.map((member) => (
            <MemberGridCard key={member.id} member={member} />
          ))}
        </div>
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
                  className="cursor-pointer hover:text-foreground text-center font-medium"
                  onClick={() => handleSort("posts")}
                >
                  Activity
                  <SortIndicator field="posts" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-foreground font-medium"
                  onClick={() => handleSort("lastActive")}
                >
                  Last Seen
                  <SortIndicator field="lastActive" />
                </TableHead>
                <TableHead className="text-right font-medium w-[100px]">Actions</TableHead>
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
                  <TableRow key={member.id} className="hover:bg-muted/30">
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
                    <TableCell className="text-center py-3">
                      <div className="text-sm">
                        <div>{member.postCount || 0} posts</div>
                        <div className="text-xs text-muted-foreground">{member.commentCount || 0} comments</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground py-3">
                      {member.lastOnlineRelative || "Offline"}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-7 w-7 p-0 hover:bg-muted"
                        >
                          <Link href={memberUrl}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="sr-only">View profile</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-muted"
                          onClick={() => {
                            // TODO: Implement Discord DM functionality
                            console.log("Message member:", member.id);
                          }}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span className="sr-only">Message</span>
                        </Button>
                      </div>
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