"use client";

import { Globe, Loader2, Save, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AvatarUpload } from "@/components/members/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateMember } from "@/hooks/use-members";
import { useMutationError } from "@/hooks/use-mutation-error";
import { useNetworkStatus } from "@/hooks/use-network-status";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  bio?: string | null;
  location?: string | null;
  linkGithub?: string | null;
  linkX?: string | null;
  linkYouTube?: string | null;
  avatarUrl?: string | null;
  websiteUrl?: string | null;
}

interface MemberEditFormProps {
  member: Member;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  bio: string;
  location: string;
  githubHandle: string;
  xHandle: string;
  youtubeHandle: string;
  websiteUrl: string;
}

// Helper functions to extract handles from URLs
const extractHandle = (url: string, platform: string): string => {
  if (!url) return "";

  const patterns = {
    github: /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/,
    x: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([^/?#]+)/,
    youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([^/?#]+)/,
  };

  const pattern = patterns[platform as keyof typeof patterns];
  const match = url.match(pattern);
  return match ? match[1] : "";
};

// Helper functions to construct full URLs from handles
const constructUrl = (handle: string, platform: string): string => {
  if (!handle.trim()) return "";

  const cleanHandle = handle.trim();
  const baseUrls = {
    github: "https://github.com/",
    x: "https://x.com/",
    youtube: "https://youtube.com/@",
  };

  return baseUrls[platform as keyof typeof baseUrls] + cleanHandle;
};

// Handle validation (no special characters, reasonable length)
const validateHandle = (handle: string): boolean => {
  if (!handle) return true; // Empty handles are valid (optional)
  // Allow alphanumeric, hyphens, underscores, and dots (common in usernames)
  return /^[a-zA-Z0-9._-]+$/.test(handle) && handle.length <= 50;
};

export default function MemberEditForm({ member, onSuccess, onCancel }: MemberEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(member.avatarUrl || "");
  const updateMemberMutation = useUpdateMember();
  const { handleMutationError, handleMutationSuccess } = useMutationError();
  const { isOnline } = useNetworkStatus();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
  } = useForm<FormData>({
    defaultValues: {
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      bio: member.bio || "",
      location: member.location || "",
      githubHandle: extractHandle(member.linkGithub || "", "github"),
      xHandle: extractHandle(member.linkX || "", "x"),
      youtubeHandle: extractHandle(member.linkYouTube || "", "youtube"),
      websiteUrl: member.websiteUrl || "",
    },
  });

  const bioValue = watch("bio");
  const bioLength = bioValue?.length || 0;

  // Check if avatar has changed
  const isAvatarChanged = avatarUrl !== (member.avatarUrl || "");
  const isFormDirty = isDirty || isAvatarChanged;

  const onSubmit = async (data: FormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    const updateData = {
      firstName: data.firstName.trim() || undefined,
      lastName: data.lastName.trim() || undefined,
      bio: data.bio.trim() || undefined,
      location: data.location.trim() || undefined,
      linkGithub: constructUrl(data.githubHandle, "github") || undefined,
      linkX: constructUrl(data.xHandle, "x") || undefined,
      linkYouTube: constructUrl(data.youtubeHandle, "youtube") || undefined,
      avatarUrl: avatarUrl || undefined,
      websiteUrl: data.websiteUrl.trim() || undefined,
    };

    try {
      await updateMemberMutation.mutateAsync({ memberId: member.id, data: updateData });
      handleMutationSuccess("Profile updated successfully!");
      onSuccess();
    } catch (error) {
      handleMutationError(
        error,
        async () => {
          await updateMemberMutation.mutateAsync({ memberId: member.id, data: updateData });
        },
        {
          context: "updating profile",
          maxRetries: 3,
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Avatar Upload */}
      <div className="space-y-2">
        <Label>Profile Photo</Label>
        <AvatarUpload
          initialUrl={avatarUrl}
          onUpload={setAvatarUrl}
          onRemove={() => setAvatarUrl("")}
        />
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="First name"
            {...register("firstName", {
              required: "First name is required",
              maxLength: {
                value: 50,
                message: "First name must be less than 50 characters",
              },
            })}
          />
          {errors.firstName && (
            <span className="text-sm text-red-600">{errors.firstName.message}</span>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Last name"
            {...register("lastName", {
              required: "Last name is required",
              maxLength: {
                value: 50,
                message: "Last name must be less than 50 characters",
              },
            })}
          />
          {errors.lastName && (
            <span className="text-sm text-red-600">{errors.lastName.message}</span>
          )}
        </div>
      </div>

      {/* Bio Field */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Tell us about yourself..."
          className="min-h-[100px] resize-none"
          {...register("bio", {
            maxLength: {
              value: 500,
              message: "Bio must be less than 500 characters",
            },
          })}
        />
        <div className="flex justify-between text-sm">
          <div>{errors.bio && <span className="text-red-600">{errors.bio.message}</span>}</div>
          <span className={`${bioLength > 450 ? "text-red-600" : "text-muted-foreground"}`}>
            {bioLength}/500
          </span>
        </div>
      </div>

      {/* Location Field */}
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="City, Country"
          {...register("location", {
            maxLength: {
              value: 100,
              message: "Location must be less than 100 characters",
            },
          })}
        />
        {errors.location && <span className="text-sm text-red-600">{errors.location.message}</span>}
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Social Links</h3>

        {/* GitHub */}
        <div className="space-y-2">
          <Label htmlFor="githubHandle">GitHub</Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border-r-0 border rounded-l-md">
              github.com/
            </span>
            <Input
              id="githubHandle"
              placeholder="username"
              className="rounded-l-none"
              {...register("githubHandle", {
                validate: (value) =>
                  validateHandle(value) ||
                  "Please enter a valid username (letters, numbers, dots, hyphens, underscores only)",
              })}
            />
          </div>
          {errors.githubHandle && (
            <span className="text-sm text-red-600">{errors.githubHandle.message}</span>
          )}
        </div>

        {/* X (Twitter) */}
        <div className="space-y-2">
          <Label htmlFor="xHandle">X (Twitter)</Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 rounded-l-md">
              x.com/
            </span>
            <Input
              id="xHandle"
              placeholder="username"
              className="rounded-l-none"
              {...register("xHandle", {
                validate: (value) =>
                  validateHandle(value) ||
                  "Please enter a valid username (letters, numbers, dots, hyphens, underscores only)",
              })}
            />
          </div>
          {errors.xHandle && <span className="text-sm text-red-600">{errors.xHandle.message}</span>}
        </div>

        {/* YouTube */}
        <div className="space-y-2">
          <Label htmlFor="youtubeHandle">YouTube</Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border-r-0 border rounded-l-md">
              youtube.com/@
            </span>
            <Input
              id="youtubeHandle"
              placeholder="username"
              className="rounded-l-none"
              {...register("youtubeHandle", {
                validate: (value) =>
                  validateHandle(value) ||
                  "Please enter a valid username (letters, numbers, dots, hyphens, underscores only)",
              })}
            />
          </div>
          {errors.youtubeHandle && (
            <span className="text-sm text-red-600">{errors.youtubeHandle.message}</span>
          )}
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website</Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border-r-0 border rounded-l-md">
              <Globe className="w-4 h-4" />
            </span>
            <Input
              id="websiteUrl"
              placeholder="https://example.com"
              className="rounded-l-none"
              {...register("websiteUrl", {
                pattern: {
                  value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
                  message: "Please enter a valid URL",
                },
                maxLength: {
                  value: 500,
                  message: "Website URL must be less than 500 characters",
                },
              })}
            />
          </div>
          {errors.websiteUrl && (
            <span className="text-sm text-red-600">{errors.websiteUrl.message}</span>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          variant="default"
          disabled={isSubmitting || !isFormDirty || !isOnline}
          title={!isOnline ? "You're offline. Please check your connection." : undefined}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isSubmitting ? "Saving..." : !isOnline ? "Offline" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
