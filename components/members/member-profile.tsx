"use client";
import { CalendarDays, Github, Globe, Linkedin, Youtube } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import MemberEditModal from "@/components/members/member-edit-modal";
import { MemberProfileFieldIndicator } from "@/components/members/member-profile-field-indicator";
import { MemberProfileFieldModal } from "@/components/members/member-profile-field-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { detectCountryFromLocation, getFlagEmoji } from "@/lib/country-utils";

interface MemberProfileProps {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    bio: string;
    joinedDate: string;
    location?: string;
    country: string;
    status: "active" | "churned";
    initials: string;
    linkGithub?: string;
    linkX?: string;
    linkYouTube?: string;
    avatarUrl?: string;
    websiteUrl?: string;
    linkedinUrl?: string;
    skills?: string[];
    slug?: string;
    postCount?: number;
    // Subscription fields (no free tier - platform operates with zero free users)
    tier?: "founding_member" | "early_bird" | "member" | "scholarship";
    subscriptionStatus: "active" | "cancelled" | "past_due" | "expired" | "none";
    subscriptionEndDate?: number;
    billingInterval?: "monthly" | "yearly";
  };
}

export default function MemberProfile({ member }: MemberProfileProps) {
  const { user, isAuthenticated } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeFieldModal, setActiveFieldModal] = useState<
    "bio" | "location" | "github" | "x" | "youtube" | "website" | "avatar" | null
  >(null);
  const [isAvatarLightboxOpen, setIsAvatarLightboxOpen] = useState(false);

  const initials = member.initials;
  const joinedDateFormatted = member.joinedDate;

  // Check if the current user can edit this profile
  const canEdit = isAuthenticated && user?.id === member.id;

  // Detect country from location or use the country field
  const detectedCountryCode = detectCountryFromLocation(member.location) || member.country;
  const flagEmoji = detectedCountryCode ? getFlagEmoji(detectedCountryCode) : null;

  // Transform member data for the edit modal
  const memberForEdit = {
    _id: member.id,
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

  // Check if member has premium tier for verification badge
  const isVerified = member.tier === "founding_member" || member.tier === "early_bird";

  return (
    <div>
      {/* Banner and Avatar Section */}
      <div className="relative">
        {/* Banner placeholder - using gradient */}
        <div className="from-muted to-muted/50 h-48 w-full bg-gradient-to-r" />

        {/* Avatar positioned to overlap banner */}
        <div className="absolute -bottom-16 left-6">
          <div
            className={member.avatarUrl ? "group cursor-pointer" : ""}
            onClick={() => member.avatarUrl && setIsAvatarLightboxOpen(true)}
          >
            <Avatar className="border-background h-32 w-32 rounded-full border-4 transition-transform group-hover:scale-105">
              <AvatarImage src={member.avatarUrl || ""} />
              <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
            </Avatar>
          </div>
          {canEdit && !member.avatarUrl && (
            <button
              onClick={() => setActiveFieldModal("avatar")}
              className="bg-foreground text-background absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
              title="Add profile photo"
            >
              <span className="absolute flex h-full w-full">
                <span className="bg-foreground absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                <span className="bg-foreground relative inline-flex h-full w-full rounded-full"></span>
              </span>
              <span className="relative z-10 text-xs font-bold">+</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-6 pb-4 pt-20">
        {/* Edit button positioned at top right */}
        <div className="flex justify-end">
          {canEdit && (
            <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
              Edit profile
            </Button>
          )}
        </div>

        {/* Name and username */}
        <div className="mt-4">
          <div className="flex items-center gap-1">
            <h2 className="text-2xl font-bold">
              {member.firstName} {member.lastName}
            </h2>
            {isVerified && (
              <svg className="h-5 w-5 fill-current text-blue-500" viewBox="0 0 24 24">
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.92.81c.66 1.31 1.9 2.19 3.33 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
              </svg>
            )}
          </div>
          <p className="text-muted-foreground">@{member.slug || member.email.split("@")[0]}</p>
        </div>

        {/* Bio */}
        <div className="mt-4">
          {member.bio ? (
            <p className="text-sm">{member.bio}</p>
          ) : canEdit ? (
            <MemberProfileFieldIndicator
              label="Bio"
              onClick={() => setActiveFieldModal("bio")}
              className="w-full justify-center"
            />
          ) : null}
        </div>

        {/* Info Section */}
        <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
          {/* Location */}
          {member.location ? (
            <div className="flex items-center">
              {flagEmoji && <span className="mr-1">{flagEmoji}</span>}
              {member.location}
            </div>
          ) : canEdit ? (
            <MemberProfileFieldIndicator
              label="Location"
              onClick={() => setActiveFieldModal("location")}
              className="text-sm"
            />
          ) : null}

          {/* Join Date */}
          <div className="flex items-center">
            <CalendarDays className="mr-1 h-4 w-4" />
            Joined {joinedDateFormatted}
          </div>
        </div>

        {/* Social Links */}
        <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
          {member.linkGithub ? (
            <a
              href={member.linkGithub}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          ) : (
            canEdit && (
              <MemberProfileFieldIndicator
                label="GitHub"
                onClick={() => setActiveFieldModal("github")}
              />
            )
          )}
          {member.linkX ? (
            <a
              href={member.linkX}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Twitter</span>
            </a>
          ) : (
            canEdit && (
              <MemberProfileFieldIndicator label="X" onClick={() => setActiveFieldModal("x")} />
            )
          )}
          {member.linkYouTube ? (
            <a
              href={member.linkYouTube}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <Youtube className="h-4 w-4" />
              <span>YouTube</span>
            </a>
          ) : (
            canEdit && (
              <MemberProfileFieldIndicator
                label="YouTube"
                onClick={() => setActiveFieldModal("youtube")}
              />
            )
          )}
          {member.linkedinUrl ? (
            <a
              href={member.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <Linkedin className="h-4 w-4" />
              <span>LinkedIn</span>
            </a>
          ) : null}
          {member.websiteUrl ? (
            <a
              href={member.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <Globe className="h-4 w-4" />
              <span>Website</span>
            </a>
          ) : (
            canEdit && (
              <MemberProfileFieldIndicator
                label="Website"
                onClick={() => setActiveFieldModal("website")}
              />
            )
          )}
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
            <MemberProfileFieldModal
              memberId={member.id}
              field={activeFieldModal}
              currentValue={
                activeFieldModal === "bio"
                  ? member.bio
                  : activeFieldModal === "location"
                    ? member.location
                    : activeFieldModal === "github"
                      ? member.linkGithub
                      : activeFieldModal === "x"
                        ? member.linkX
                        : activeFieldModal === "youtube"
                          ? member.linkYouTube
                          : activeFieldModal === "website"
                            ? member.websiteUrl
                            : activeFieldModal === "avatar"
                              ? member.avatarUrl
                              : undefined
              }
              isOpen={true}
              onClose={() => setActiveFieldModal(null)}
            />
          )}
        </>
      )}

      {/* Avatar Lightbox */}
      <Dialog open={isAvatarLightboxOpen} onOpenChange={setIsAvatarLightboxOpen}>
        <DialogContent className="max-w-4xl overflow-hidden p-0">
          <DialogTitle className="sr-only">
            {member.firstName} {member.lastName}&apos;s profile photo
          </DialogTitle>
          {member.avatarUrl && (
            <div className="bg-background relative flex h-full w-full items-center justify-center">
              <Image
                src={member.avatarUrl}
                alt={`${member.firstName} ${member.lastName}&apos;s avatar`}
                className="max-h-[90vh] max-w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
