"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MediaUploadIcon } from "@/components/icons/media-upload";
import { GifIcon } from "@/components/icons/gif";
import { SmileIcon } from "@/components/icons/smile";
import { toast } from "sonner";
import EmojiPicker from "emoji-picker-react";
import {
  uploadMedia,
  validateMediaFile,
  getFilePreviewUrl,
  revokeFilePreviewUrl,
} from "@/lib/upload-media";
import { GifPicker } from "./gif-picker";
import { MentionAutocomplete } from "./mention-autocomplete";
import { Id } from "@/convex/_generated/dataModel";
import { MediaPreviewGrid } from "@/components/posts/media-preview-grid";
import { MediaItem } from "@/types";

type AttachmentType = {
  id: string;
  type: "image" | "document" | "gif";
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
};

// Internal attachment item that can hold either a File or remote URL
type AttachmentItem = {
  id: string;
  type: "image" | "document" | "gif";
  url: string; // preview URL or remote URL
  fileName: string;
  fileSize: number;
  mimeType: string;
  order: number;
  file?: File; // Present if needs upload
  width?: number;
  height?: number;
};

type LinkPreviewType = {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
};

interface EnhancedCommentInputProps {
  placeholder: string;
  onSubmit: (
    content: string,
    attachments?: AttachmentType[],
    linkPreviews?: Record<string, LinkPreviewType>,
    mentions?: Id<"members">[],
  ) => void;
  isSubmitting: boolean;
  className?: string;
  initialValue?: string;
  initialAttachments?: AttachmentType[];
}

export function EnhancedCommentInput({
  placeholder,
  onSubmit,
  isSubmitting,
  className = "",
  initialValue = "",
  initialAttachments = [],
}: EnhancedCommentInputProps) {
  const [content, setContent] = useState(initialValue);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [linkPreviews, setLinkPreviews] = useState<
    Record<string, LinkPreviewType>
  >({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentions, setMentions] = useState<Id<"members">[]>([]);
  const [memberResults, setMemberResults] = useState<
    Array<{
      _id: Id<"members">;
      firstName: string;
      lastName: string;
      slug: string;
    }>
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const convex = useConvex();
  const fetchLinkPreview = useAction(api.linkPreviews.fetchLinkPreview);

  // Initialize attachments from initialAttachments
  useEffect(() => {
    if (initialAttachments.length > 0) {
      const items: AttachmentItem[] = initialAttachments.map((att, index) => ({
        id: att.id,
        type: att.type,
        url: att.url,
        fileName: att.fileName,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
        order: index,
        width: att.width,
        height: att.height,
        // No file property - these are already uploaded
      }));
      setAttachments(items);
    }
  }, [initialAttachments]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);

      for (const file of files) {
        const validation = validateMediaFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          continue;
        }

        if (attachments.length >= 5) {
          toast.error("Maximum 5 attachments allowed per comment");
          break;
        }

        const previewUrl = getFilePreviewUrl(file);
        const newItem: AttachmentItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: file.type.startsWith("image/") ? "image" : "document",
          url: previewUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          order: attachments.length,
          file, // Store file for later upload
        };

        setAttachments((prev) => [...prev, newItem]);
      }
    },
    [attachments.length],
  );

  const handleRemoveAttachment = useCallback(
    (mediaId: string) => {
      const item = attachments.find((a) => a.id === mediaId);
      if (item?.file) {
        // Revoke preview URL if it's a local file
        revokeFilePreviewUrl(item.url);
      }

      setAttachments((prev) => {
        const filtered = prev.filter((a) => a.id !== mediaId);
        // Reorder remaining items
        return filtered.map((item, index) => ({ ...item, order: index }));
      });
    },
    [attachments],
  );

  const handleReorderAttachments = useCallback(
    (reorderedMedia: MediaItem[]) => {
      setAttachments((prev) => {
        const newOrder = reorderedMedia.map((media) => media.id);
        const sorted = [...prev].sort((a, b) => {
          const aIndex = newOrder.indexOf(a.id);
          const bIndex = newOrder.indexOf(b.id);
          return aIndex - bIndex;
        });
        // Update order property
        return sorted.map((item, index) => ({ ...item, order: index }));
      });
    },
    [],
  );

  const handleEmojiSelect = useCallback((emojiData: { emoji: string }) => {
    setContent((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  }, []);

  const handleContentChange = useCallback(
    async (newContent: string, cursorPosition?: number) => {
      setContent(newContent);

      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = newContent.match(urlRegex) || [];

      for (const url of urls) {
        if (!linkPreviews[url]) {
          try {
            const preview = await fetchLinkPreview({ url });
            if (preview) {
              setLinkPreviews((prev) => ({ ...prev, [url]: preview }));
            }
          } catch (error) {
            console.error("Failed to fetch link preview:", error);
          }
        }
      }

      if (cursorPosition !== undefined) {
        const textBeforeCursor = newContent.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");

        if (lastAtIndex !== -1) {
          const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
          const hasSpaceAfterAt =
            textAfterAt.includes(" ") || textAfterAt.includes("\n");

          if (!hasSpaceAfterAt && textAfterAt.length <= 20) {
            setMentionSearchTerm(textAfterAt);
            setMentionStartIndex(lastAtIndex);
            setShowMentionAutocomplete(true);

            const textarea = document.querySelector("textarea");
            const wrapper = wrapperRef.current;
            if (textarea && wrapper) {
              const textRect = textarea.getBoundingClientRect();
              const wrapRect = wrapper.getBoundingClientRect();
              setMentionPosition({
                top: textRect.bottom - wrapRect.top + 5,
                left: textRect.left - wrapRect.left,
              });
            }
          } else {
            setShowMentionAutocomplete(false);
          }
        } else {
          setShowMentionAutocomplete(false);
        }
      }
    },
    [fetchLinkPreview, linkPreviews],
  );

  const handleMentionSelect = useCallback(
    (member: {
      _id: Id<"members">;
      firstName: string;
      lastName: string;
      slug: string;
    }) => {
      const beforeMention = content.slice(0, mentionStartIndex);
      const afterMention = content.slice(
        mentionStartIndex + mentionSearchTerm.length + 1,
      );
      const newContent = `${beforeMention}@${member.slug} ${afterMention}`;

      setContent(newContent);
      setMentions((prev) => [...prev, member._id]);
      setShowMentionAutocomplete(false);
      setMentionSearchTerm("");
      setMentionStartIndex(-1);
    },
    [content, mentionStartIndex, mentionSearchTerm],
  );

  const handleMentionClose = useCallback(() => {
    setShowMentionAutocomplete(false);
    setMentionSearchTerm("");
    setMentionStartIndex(-1);
  }, []);

  const handleGifSelect = useCallback(
    (gifUrl: string) => {
      if (attachments.length >= 5) {
        toast.error("Maximum 5 attachments allowed per comment");
        return;
      }

      const gifItem: AttachmentItem = {
        id: `gif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "gif",
        url: gifUrl,
        fileName: "giphy.gif",
        fileSize: 0,
        mimeType: "image/gif",
        order: attachments.length,
        // No file - this is already a remote URL
      };

      setAttachments((prev) => [...prev, gifItem]);
      setShowGifPicker(false);
    },
    [attachments.length],
  );

  const handleSubmit = useCallback(async () => {
    if (!content.trim() && attachments.length === 0) return;

    const uploadedAttachments: AttachmentType[] = [];

    try {
      // Upload attachments that have files
      for (const item of attachments) {
        if (item.file) {
          // This needs upload
          const uploadResult = await uploadMedia(convex, item.file);
          uploadedAttachments.push({
            id: item.id,
            type: item.type,
            url: uploadResult.url,
            fileName: item.fileName,
            fileSize: item.fileSize,
            mimeType: item.mimeType,
            width: item.width,
            height: item.height,
          });
        } else {
          // Already uploaded or remote URL (like GIF)
          uploadedAttachments.push({
            id: item.id,
            type: item.type,
            url: item.url,
            fileName: item.fileName,
            fileSize: item.fileSize,
            mimeType: item.mimeType,
            width: item.width,
            height: item.height,
          });
        }
      }

      onSubmit(
        content,
        uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        Object.keys(linkPreviews).length > 0 ? linkPreviews : undefined,
        mentions.length > 0 ? mentions : undefined,
      );

      // Clean up
      setContent("");
      setAttachments([]);
      setMentions([]);
      // Revoke any preview URLs
      attachments.forEach((item) => {
        if (item.file) {
          revokeFilePreviewUrl(item.url);
        }
      });
      setLinkPreviews({});
    } catch (error) {
      console.error("Failed to upload attachments:", error);
      toast.error("Failed to upload attachments. Please try again.");
    }
  }, [content, attachments, linkPreviews, mentions, onSubmit, convex]);

  // Convert AttachmentItem[] to MediaItem[] for MediaPreviewGrid
  const mediaItems: MediaItem[] = attachments.map((item) => ({
    id: item.id,
    type:
      item.type === "gif"
        ? "image"
        : item.type === "document"
          ? "pdf"
          : "image",
    url: item.url,
    thumbnailUrl: item.url,
    order: item.order,
    fileSize: item.fileSize,
  }));

  // Fetch members for mention suggestions
  useEffect(() => {
    let cancelled = false;
    const fetchMembers = async () => {
      if (!showMentionAutocomplete) return;
      try {
        // When search term is empty (just "@"), show first 20 members
        const term = mentionSearchTerm.trim();
        const results =
          term.length === 0
            ? await convex.query(api.members.getAllMembers, {})
            : await convex.query(api.members.searchMembers, {
                searchTerm: term,
                limit: 20,
              });
        if (!cancelled) {
          setMemberResults(results.slice(0, 20));
        }
      } catch (error) {
        console.error("Failed to search members:", error);
      }
    };
    fetchMembers();
    return () => {
      cancelled = true;
    };
  }, [mentionSearchTerm, showMentionAutocomplete, convex]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      const isMac = navigator.userAgent.includes("Mac");
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div ref={wrapperRef} className={`space-y-3 ${className} relative`}>
      <div className="relative">
        <Textarea
          placeholder={placeholder}
          value={content}
          onChange={(e) => {
            const target = e.target as HTMLTextAreaElement;
            handleContentChange(e.target.value, target.selectionStart);
          }}
          onKeyDown={handleKeyDown}
          className="min-h-[80px]"
        />
        {showMentionAutocomplete && (
          <div
            style={{
              position: "absolute",
              top: mentionPosition.top,
              left: mentionPosition.left,
              zIndex: 50,
            }}
          >
            <MentionAutocomplete
              items={memberResults}
              onSelect={handleMentionSelect}
              onClose={handleMentionClose}
            />
          </div>
        )}
      </div>

      {/* Post button below textarea */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSubmit} disabled={isSubmitting} size="sm">
          {isSubmitting ? "Posting..." : "Post"}
        </Button>
      </div>

      {attachments.length > 0 && (
        <MediaPreviewGrid
          media={mediaItems}
          onReorder={handleReorderAttachments}
          onRemove={handleRemoveAttachment}
          disabled={isSubmitting}
        />
      )}

      {Object.entries(linkPreviews).map(([url, preview]) => (
        <div key={url} className="bg-muted/50 rounded border p-3">
          <div className="text-sm font-medium">{preview.title}</div>
          <div className="text-muted-foreground text-xs">
            {preview.description}
          </div>
          <div className="text-xs text-blue-600">{url}</div>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={attachments.length >= 5}
        >
          <MediaUploadIcon size={16} />
        </Button>

        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm">
              <SmileIcon size={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <EmojiPicker onEmojiClick={handleEmojiSelect} />
          </PopoverContent>
        </Popover>

        <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm">
              <GifIcon size={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <GifPicker onGifSelect={handleGifSelect} />
          </PopoverContent>
        </Popover>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.md,.ppt,.pptx,.xls,.xlsx,.csv"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
