"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Github, Twitter, Youtube, MapPin, CalendarDays, Globe, Linkedin, FileText, MessageCircle, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { memberProfileUrl } from "@/lib/slug-utils";
import type { Id } from "@/convex/_generated/dataModel";


interface Member {
  id: string
  firstName: string
  lastName: string
  status: "active" | "churned" | "free"
  joinedDate: string
  country: string
  bio: string
  linkGithub?: string
  linkX?: string
  linkYouTube?: string
  location?: string
  linkedinUrl?: string
  websiteUrl?: string
  avatarUrl?: string
  skills?: string[]
  postCount?: number
  commentCount?: number
  netVoteCount?: number
  lastOnlineRelative?: string
  slug?: string
}

interface MemberCardProps {
  member: Member
}

// Updated status colors with dark mode support
const statusVariants = {
  active: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary",
  inactive: "bg-muted text-muted-foreground border-border",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  churned: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  free: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
}

// Stat component for contribution stats
function Stat({ icon: Icon, value, label, testId }: { 
  icon: React.ComponentType<{ className?: string }>, 
  value: number, 
  label: string,
  testId?: string 
}) {
  return (
    <div className="flex items-center space-x-1">
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="text-xs font-medium" data-testid={testId}>
        {value} {label}
      </span>
    </div>
  );
}

export default function MemberCard({ member }: MemberCardProps) {
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
  // Use the pre-formatted date from server (member.joinedDate is already formatted)
  const joinedDateFormatted = member.joinedDate

  // Stats are now included in the `member` prop directly (computed server-side)
  const stats = {
    postCount: member.postCount ?? 0,
    commentCount: member.commentCount ?? 0,
    netVoteCount: member.netVoteCount ?? 0,
  };

  // Generate member profile URL using slug
  const memberUrl = memberProfileUrl({ slug: member.slug!, _id: member.id as Id<"members"> });

  return (
    <Link href={memberUrl} className="block group" prefetch={true}>
      <div className="bg-card border border-border/50 rounded-md p-3 hover:shadow-md transition-shadow h-full flex flex-col" data-testid="member-card">
        <div className="flex items-start mb-3">
          <Avatar className="h-12 w-12 mr-3">
            <AvatarImage
              src={member.avatarUrl || ""}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors" data-testid="member-name">
              {member.firstName} {member.lastName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className={`text-xs capitalize ${statusVariants[member.status]}`}>
                {member.status}
              </Badge>
              {member.lastOnlineRelative && (
                <Badge variant="secondary" className="text-xs">
                  Last online • {member.lastOnlineRelative} ago
                </Badge>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-grow">{member.bio}</p>

        {/* Contribution Stats */}
        {stats && (
          <div className="flex flex-wrap gap-2 mb-3 text-[10px]">
            <Stat icon={FileText} value={stats.postCount} label="Posts" testId="post-count" />
            <Stat icon={MessageCircle} value={stats.commentCount} label="Comments" testId="comment-count" />
            <Stat icon={ThumbsUp} value={stats.netVoteCount} label="Votes" testId="vote-count" />
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 mb-3">
          <div className="flex items-center">
            <CalendarDays className="w-3.5 h-3.5 mr-2" />
            Joined: {joinedDateFormatted}
          </div>
          {member.location && (
            <div className="flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-2" />
              {member.location}
            </div>
          )}
          <div className="flex items-center">
            <Globe className="w-3.5 h-3.5 mr-2" />
            {member.country}
          </div>
        </div>

        <div className="flex space-x-2 mt-auto pt-3 border-t border-border/50">
          {member.linkGithub && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Github className="w-4 h-4" />
            </Button>
          )}
          {member.linkX && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Twitter className="w-4 h-4" />
            </Button>
          )}
          {member.linkYouTube && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Youtube className="w-4 h-4" />
            </Button>
          )}
          {member.linkedinUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Linkedin className="w-4 h-4" />
            </Button>
          )}
          {member.websiteUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Globe className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Link>
  )
}
