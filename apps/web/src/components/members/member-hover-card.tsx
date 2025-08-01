"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../components/ui/hover-card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Clock, FileText, Calendar, User } from "lucide-react";
import { Id } from "@/web/convex/_generated/dataModel";
import { formatDistanceToNow, format } from "date-fns";
import { getFlagEmoji } from "@/lib/country-utils";
import Link from "next/link";

interface MemberHoverCardProps {
  memberId: Id<"members">;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function MemberHoverCard({
  memberId,
  children,
  side = "top",
  align = "center",
}: MemberHoverCardProps) {
  const member = useQuery(api.members.getMemberById, { id: memberId });

  if (!member) {
    return <>{children}</>;
  }

  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  const lastActiveText = member.lastOnline
    ? formatDistanceToNow(new Date(member.lastOnline), { addSuffix: true })
    : "Unknown";

  return (
    <HoverCard openDelay={500}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 p-4" side={side} align={align}>
        <div className="space-y-4">
          {/* Header with Avatar and Name */}
          <div className="flex items-start space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.avatarUrl || ""} />
              <AvatarFallback className="text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">
                  {member.firstName} {member.lastName}
                </h4>
                {member.country && (
                  <span className="text-base">
                    {getFlagEmoji(member.country)}
                  </span>
                )}
              </div>
              <div className="text-muted-foreground flex items-center gap-4 text-xs">
                <div className="flex items-center">
                  <FileText className="mr-1 h-3 w-3" />
                  <span>{member.postCount} posts</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="mr-1 h-3 w-3" />
                  <span>
                    Joined {format(new Date(member.joinedDate), "MMM yyyy")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Last Active */}
          <div className="text-muted-foreground flex items-center text-sm">
            <Clock className="mr-2 h-3.5 w-3.5" />
            <span>Active {lastActiveText}</span>
          </div>

          {/* View Profile Button */}
          <Button
            className="w-full"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
            }}
            asChild
          >
            <Link href={`/members/${member.slug}`}>
              <User className="mr-2 h-4 w-4" />
              View Profile
            </Link>
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface MemberHoverCardWrapperProps {
  member: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    slug?: string;
    username?: string;
    avatarUrl?: string | null;
  } | null;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function MemberHoverCardWrapper({
  member,
  children,
  side = "top",
  align = "center",
}: MemberHoverCardWrapperProps) {
  if (!member) {
    return <>{children}</>;
  }

  return (
    <MemberHoverCard memberId={member._id} side={side} align={align}>
      {children}
    </MemberHoverCard>
  );
}
