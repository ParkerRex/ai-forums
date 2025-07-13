"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, X, Globe } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useForm } from "react-hook-form";
import { useMutationError } from "@/hooks/use-mutation-error";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { AvatarUpload } from "@/components/avatar-upload";

interface ProfileFieldModalProps {
  memberId: Id<"members">;
  field: "bio" | "location" | "github" | "x" | "youtube" | "website" | "avatar";
  currentValue?: string;
  isOpen: boolean;
  onClose: () => void;
}

const fieldConfig = {
  bio: {
    title: "Add Bio",
    description: "Tell the community about yourself.",
    placeholder: "Tell us about yourself...",
    prefix: undefined,
  },
  location: {
    title: "Add Location", 
    description: "Add your location to help members find others nearby.",
    placeholder: "City, Country",
    prefix: undefined,
  },
  github: {
    title: "Add GitHub",
    description: "Share your GitHub profile to showcase your projects.",
    placeholder: "username",
    prefix: "github.com/",
  },
  x: {
    title: "Add X (Twitter)",
    description: "Connect your X (Twitter) account.",
    placeholder: "username",
    prefix: "x.com/",
  },
  youtube: {
    title: "Add YouTube",
    description: "Share your YouTube channel.",
    placeholder: "username",
    prefix: "youtube.com/@",
  },
  website: {
    title: "Add Website",
    description: "Add your personal or professional website.",
    placeholder: "https://example.com",
    prefix: undefined,
  },
  avatar: {
    title: "Add Profile Photo",
    description: "Upload a profile photo to personalize your account.",
    placeholder: undefined,
    prefix: undefined,
  },
} as const;

// Helper functions
const extractHandle = (url: string, platform: string): string => {
  if (!url) return "";
  const patterns = {
    github: /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\?#]+)/,
    x: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([^\/\?#]+)/,
    youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([^\/\?#]+)/,
  };
  const pattern = patterns[platform as keyof typeof patterns];
  if (!pattern) return url;
  const match = url.match(pattern);
  return match ? match[1] : "";
};

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

const validateHandle = (handle: string): boolean => {
  if (!handle) return true;
  return /^[a-zA-Z0-9._-]+$/.test(handle) && handle.length <= 50;
};

export function ProfileFieldModal({
  memberId,
  field,
  currentValue,
  isOpen,
  onClose,
}: ProfileFieldModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentValue || "");
  const updateMemberProfile = useMutation(api.members.updateMemberProfile);
  const { handleMutationError, handleMutationSuccess } = useMutationError();
  const { isOnline } = useNetworkStatus();

  const config = fieldConfig[field];
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      value: field === "github" || field === "x" || field === "youtube"
        ? extractHandle(currentValue || "", field)
        : currentValue || "",
    },
  });

  const bioValue = field === "bio" ? watch("value") : "";
  const bioLength = bioValue?.length || 0;

  const onSubmit = async (data: { value: string }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const updateData: {
        id: Id<"members">;
        bio?: string;
        location?: string;
        linkGithub?: string;
        linkX?: string;
        linkYouTube?: string;
        websiteUrl?: string;
        avatarUrl?: string;
      } = { id: memberId };
      
      if (field === "bio") {
        updateData.bio = data.value.trim() || undefined;
      } else if (field === "location") {
        updateData.location = data.value.trim() || undefined;
      } else if (field === "github") {
        updateData.linkGithub = constructUrl(data.value, "github") || undefined;
      } else if (field === "x") {
        updateData.linkX = constructUrl(data.value, "x") || undefined;
      } else if (field === "youtube") {
        updateData.linkYouTube = constructUrl(data.value, "youtube") || undefined;
      } else if (field === "website") {
        updateData.websiteUrl = data.value.trim() || undefined;
      } else if (field === "avatar") {
        updateData.avatarUrl = avatarUrl || undefined;
      }

      await updateMemberProfile(updateData);
      handleMutationSuccess(`${config.title.replace("Add ", "")} added successfully!`);
      onClose();
    } catch (error) {
      handleMutationError(error, async () => {}, {
        context: `adding ${field}`,
        maxRetries: 3,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (field === "avatar") {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ value: avatarUrl });
          }} className="space-y-6">
            <div className="space-y-2">
              <Label>Profile Photo</Label>
              <AvatarUpload
                initialUrl={avatarUrl}
                onUpload={setAvatarUrl}
                onRemove={() => setAvatarUrl("")}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !avatarUrl || !isOnline}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? "Saving..." : "Save Photo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="field-input">
              {field === "bio" ? "Bio" : 
               field === "location" ? "Location" :
               field === "website" ? "Website URL" :
               field.charAt(0).toUpperCase() + field.slice(1)}
            </Label>
            
            {field === "bio" ? (
              <>
                <Textarea
                  id="field-input"
                  placeholder={config.placeholder || ""}
                  className="min-h-[100px] resize-none"
                  autoFocus
                  {...register("value", {
                    maxLength: {
                      value: 500,
                      message: "Bio must be less than 500 characters",
                    },
                  })}
                />
                <div className="flex justify-between text-sm">
                  <div>
                    {errors.value && (
                      <span className="text-red-600">{errors.value.message}</span>
                    )}
                  </div>
                  <span className={`${bioLength > 450 ? "text-red-600" : "text-muted-foreground"}`}>
                    {bioLength}/500
                  </span>
                </div>
              </>
            ) : (
              <div className={config.prefix ? "flex" : ""}>
                {config.prefix && (
                  <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border-r-0 border rounded-l-md">
                    {field === "website" ? <Globe className="w-4 h-4" /> : config.prefix}
                  </span>
                )}
                <Input
                  id="field-input"
                  placeholder={config.placeholder || ""}
                  className={config.prefix ? "rounded-l-none" : ""}
                  autoFocus
                  {...register("value", {
                    ...(field === "location" && {
                      maxLength: {
                        value: 100,
                        message: "Location must be less than 100 characters",
                      },
                    }),
                    ...(field === "website" && {
                      pattern: {
                        value: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
                        message: "Please enter a valid URL",
                      },
                      maxLength: {
                        value: 500,
                        message: "Website URL must be less than 500 characters",
                      },
                    }),
                    ...((field === "github" || field === "x" || field === "youtube") && {
                      validate: (value) =>
                        validateHandle(value) ||
                        "Please enter a valid username (letters, numbers, dots, hyphens, underscores only)",
                    }),
                  })}
                />
              </div>
            )}
            {errors.value && field !== "bio" && (
              <span className="text-sm text-red-600">{errors.value.message}</span>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isOnline}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? "Saving..." : !isOnline ? "Offline" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}