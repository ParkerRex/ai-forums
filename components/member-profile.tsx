"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Globe, Github, Youtube, Edit, ExternalLink, Linkedin } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexAuth } from "convex/react";
import MemberEditModal from "@/components/member-edit-modal";
import { formatDate, formatTierName } from "@/lib/format";
import { SubscriptionStatusSkeleton } from "@/components/subscription-status-skeleton";
import { ProfileFieldIndicator } from "@/components/profile-field-indicator";
import { ProfileFieldModal } from "@/components/profile-field-modal";
import { detectCountryFromLocation, getFlagEmoji, getCountryName } from "@/lib/country-utils";

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
    avatarUrl?: string;
    websiteUrl?: string;
    linkedinUrl?: string;
    skills?: string[];
    // Subscription fields
    tier: "free" | "scholarship" | "founding_member" | "early_bird" | "member";
    subscriptionStatus: "active" | "cancelled" | "past_due" | "expired" | "none";
    subscriptionEndDate?: number;
    billingInterval?: "monthly" | "yearly";
  };
}


// Tier badge colors
const tierVariants = {
  free: "bg-muted text-muted-foreground border-border",
  scholarship: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  founding_member: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  early_bird: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  member: "bg-foreground text-background border-foreground",
};


export default function MemberProfile({ member }: MemberProfileProps) {
  const { isAuthenticated } = useConvexAuth();
  const currentMember = useQuery(api.members.getCurrentMember);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeFieldModal, setActiveFieldModal] = useState<"bio" | "location" | "github" | "x" | "youtube" | "website" | "avatar" | null>(null);

  const initials = member.initials;
  const joinedDateFormatted = member.joinedDate;

  // Check if the current user can edit this profile
  const canEdit = isAuthenticated && currentMember?._id === member.id;
  
  // Detect country from location or use the country field
  const detectedCountryCode = detectCountryFromLocation(member.location) || member.country;
  const flagEmoji = detectedCountryCode ? getFlagEmoji(detectedCountryCode) : null;
  const countryDisplay = detectedCountryCode ? getCountryName(detectedCountryCode) : member.country;

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
    avatarUrl: member.avatarUrl,
    websiteUrl: member.websiteUrl,
  };

  return (
    <div className="bg-card border rounded-lg p-8">
      <div className="flex flex-col md:flex-row items-start">
        <div className="relative mr-8 mb-6 md:mb-0 flex-shrink-0">
          <Avatar className="h-32 w-32">
            <AvatarImage
              src={member.avatarUrl || ""}
            />
            <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
          </Avatar>
          {canEdit && !member.avatarUrl && (
            <button
              onClick={() => setActiveFieldModal("avatar")}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:scale-110 transition-transform"
              title="Add profile photo"
            >
              <span className="absolute flex h-full w-full">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-foreground"></span>
              </span>
              <span className="relative text-xs font-bold z-10">+</span>
            </button>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-card-foreground">
              {member.firstName} {member.lastName}
            </h1>
            <div className="flex items-center space-x-3">
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
          {member.bio ? (
            <p className="text-muted-foreground mb-4">{member.bio}</p>
          ) : canEdit ? (
            <div className="mb-4">
              <ProfileFieldIndicator
                label="Bio"
                onClick={() => setActiveFieldModal("bio")}
                className="w-full justify-center"
              />
            </div>
          ) : null}

          {/* Subscription Status */}
          <div className="flex items-center gap-2 mb-6">
              <Badge
                variant="outline"
                className={`text-sm ${tierVariants[member.tier]}`}
              >
                {formatTierName(member.tier)}
              </Badge>
              {member.subscriptionStatus === "active" && member.tier !== "free" && (
                <Badge variant="secondary" className="text-xs">
                  {member.billingInterval === "yearly" ? "Yearly" : "Monthly"}
                </Badge>
              )}
              {member.subscriptionStatus === "cancelled" && member.subscriptionEndDate && (
                <Badge variant="secondary" className="text-xs text-yellow-600 dark:text-yellow-400">
                  Expires {formatDate(member.subscriptionEndDate)}
                </Badge>
              )}
              {member.subscriptionStatus === "past_due" && (
                <Badge variant="secondary" className="text-xs text-red-600 dark:text-red-400">
                  Payment Required
                </Badge>
              )}
            </div>

          {/* Skills */}
          {member.skills && member.skills.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {member.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center">
              <CalendarDays className="w-4 h-4 mr-2" />
              Joined: {joinedDateFormatted}
            </div>
            {member.location ? (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {member.location}
              </div>
            ) : canEdit ? (
              <ProfileFieldIndicator
                label="Location"
                onClick={() => setActiveFieldModal("location")}
                className="text-sm"
              />
            ) : null}
            {countryDisplay && (
              <div className="flex items-center">
                {flagEmoji ? (
                  <span className="text-lg mr-2" role="img" aria-label={`${countryDisplay} flag`}>
                    {flagEmoji}
                  </span>
                ) : (
                  <MapPin className="w-4 h-4 mr-2" />
                )}
                {countryDisplay}
              </div>
            )}
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap gap-3">
            {member.linkGithub ? (
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
            ) : canEdit && (
              <ProfileFieldIndicator
                label="GitHub"
                onClick={() => setActiveFieldModal("github")}
              />
            )}
            {member.linkX ? (
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
            ) : canEdit && (
              <ProfileFieldIndicator
                label="X"
                onClick={() => setActiveFieldModal("x")}
              />
            )}
            {member.linkYouTube ? (
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
            ) : canEdit && (
              <ProfileFieldIndicator
                label="YouTube"
                onClick={() => setActiveFieldModal("youtube")}
              />
            )}
            {member.linkedinUrl && (
              <a
                href={member.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              >
                <Linkedin className="w-4 h-4 mr-2" />
                LinkedIn
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
            {member.websiteUrl ? (
              <a
                href={member.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              >
                <Globe className="w-4 h-4 mr-2" />
                Website
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            ) : canEdit && (
              <ProfileFieldIndicator
                label="Website"
                onClick={() => setActiveFieldModal("website")}
              />
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {canEdit && (
        <>
          <MemberEditModal
            member={memberForEdit}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
          />
          
          {/* Individual Field Modals */}
          {activeFieldModal && (
            <ProfileFieldModal
              memberId={member.id}
              field={activeFieldModal}
              currentValue={
                activeFieldModal === "bio" ? member.bio :
                activeFieldModal === "location" ? member.location :
                activeFieldModal === "github" ? member.linkGithub :
                activeFieldModal === "x" ? member.linkX :
                activeFieldModal === "youtube" ? member.linkYouTube :
                activeFieldModal === "website" ? member.websiteUrl :
                activeFieldModal === "avatar" ? member.avatarUrl :
                undefined
              }
              isOpen={true}
              onClose={() => setActiveFieldModal(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
