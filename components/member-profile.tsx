"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Globe, Github, Youtube, Edit, ExternalLink } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexAuth } from "convex/react";
import { MemberEditModal } from "@/components/member-edit-modal";

interface MemberProfileProps {
  member: {
    id: Id<"members">;
    firstName: string;
    lastName: string;
    email: string;
    bio: string;
    joinedDate: string;
    location?: string;
    country: string;
    status: "active" | "churned" | "free";
    initials: string;
    linkGithub?: string;
    linkX?: string;
    linkYouTube?: string;
  };
}

// Updated status colors with dark mode support
const statusVariants = {
  active: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary",
  inactive: "bg-muted text-muted-foreground border-border",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  churned: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  free: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
};

export default function MemberProfile({ member }: MemberProfileProps) {
  const { isAuthenticated } = useConvexAuth();
  const currentMember = useQuery(api.members.getCurrentMember);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const initials = member.initials;
  const joinedDateFormatted = member.joinedDate;

  // Check if the current user can edit this profile
  const canEdit = isAuthenticated && currentMember?._id === member.id;

  // Transform member data for the edit modal
  const memberForEdit = {
    _id: member.id as Id<"members">,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    bio: member.bio,
    location: member.location,
    linkGithub: member.linkGithub,
    linkX: member.linkX,
    linkYouTube: member.linkYouTube,
  };

  return (
    <div className="bg-card border rounded-lg p-8">
      <div className="flex flex-col md:flex-row items-start">
        <Avatar className="h-32 w-32 mr-8 mb-6 md:mb-0 flex-shrink-0">
          <AvatarImage
            src={`/placeholder.svg?width=128&height=128&query=${member.firstName}+${member.lastName}+profile+picture`}
          />
          <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-card-foreground">
              {member.firstName} {member.lastName}
            </h1>
            <div className="flex items-center space-x-3">
              <Badge
                variant="outline"
                className={`text-sm capitalize ${statusVariants[member.status]}`}
              >
                {member.status}
              </Badge>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mb-6">{member.bio}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center">
              <CalendarDays className="w-4 h-4 mr-2" />
              Joined: {joinedDateFormatted}
            </div>
            {member.location && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {member.location}
              </div>
            )}
            <div className="flex items-center">
              <Globe className="w-4 h-4 mr-2" />
              {member.country}
            </div>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap gap-3">
            {member.linkGithub && (
              <a
                href={member.linkGithub}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
            {member.linkX && (
              <a
                href={member.linkX}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X (Twitter)
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
            {member.linkYouTube && (
              <a
                href={member.linkYouTube}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              >
                <Youtube className="w-4 h-4 mr-2" />
                YouTube
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {canEdit && (
        <MemberEditModal
          member={memberForEdit}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}
