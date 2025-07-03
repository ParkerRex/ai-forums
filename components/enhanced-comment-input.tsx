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
import { Paperclip, Smile, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import EmojiPicker from "emoji-picker-react";
import Image from "next/image";
import {
  uploadMedia,
  validateMediaFile,
  getFilePreviewUrl,
  revokeFilePreviewUrl,
} from "@/lib/upload-media";
import { GifPicker } from "./gif-picker";
import { MentionAutocomplete } from "./mention-autocomplete";
import { Id } from "@/convex/_generated/dataModel";

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
}

export function EnhancedCommentInput({
  placeholder,
  onSubmit,
  isSubmitting,
  className = "",
  initialValue = "",
}: EnhancedCommentInputProps) {
  const [content, setContent] = useState(initialValue);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [gifAttachments, setGifAttachments] = useState<AttachmentType[]>([]);
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

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);

      for (const file of files) {
        const validation = validateMediaFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          continue;
        }

        if (attachments.length + gifAttachments.length >= 5) {
          toast.error("Maximum 5 attachments allowed per comment");
          break;
        }

        setAttachments((prev) => [...prev, file]);
        const previewUrl = getFilePreviewUrl(file);
        setAttachmentPreviews((prev) => [...prev, previewUrl]);
      }
    },
    [attachments.length, gifAttachments.length],
  );

  const handleRemoveAttachment = useCallback(
    (index: number) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
      const previewUrl = attachmentPreviews[index];
      if (previewUrl) {
        revokeFilePreviewUrl(previewUrl);
      }
      setAttachmentPreviews((prev) => prev.filter((_, i) => i !== index));
    },
    [attachmentPreviews],
  );

  const handleRemoveGifAttachment = useCallback((index: number) => {
    setGifAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

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

  const handleSubmit = useCallback(async () => {
    if (
      !content.trim() &&
      attachments.length === 0 &&
      gifAttachments.length === 0
    )
      return;

    const uploadedAttachments: AttachmentType[] = [];

    try {
      if (attachments.length > 0) {
        for (const file of attachments) {
          const uploadResult = await uploadMedia(convex, file);
          uploadedAttachments.push({
            id: crypto.randomUUID(),
            type: file.type.startsWith("image/") ? "image" : "document",
            url: uploadResult.url,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          });
        }
      }

      uploadedAttachments.push(...gifAttachments);

      onSubmit(
        content,
        uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        Object.keys(linkPreviews).length > 0 ? linkPreviews : undefined,
        mentions.length > 0 ? mentions : undefined,
      );

      setContent("");
      setAttachments([]);
      setGifAttachments([]);
      setMentions([]);
      attachmentPreviews.forEach((url) => revokeFilePreviewUrl(url));
      setAttachmentPreviews([]);
      setLinkPreviews({});
    } catch (error) {
      console.error("Failed to upload attachments:", error);
      toast.error("Failed to upload attachments. Please try again.");
    }
  }, [
    content,
    attachments,
    gifAttachments,
    linkPreviews,
    mentions,
    onSubmit,
    attachmentPreviews,
    convex,
  ]);

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

      {(attachments.length > 0 || gifAttachments.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div key={`file-${index}`} className="relative">
              {file.type.startsWith("image/") ? (
                <Image
                  src={attachmentPreviews[index]}
                  alt={file.name}
                  width={80}
                  height={80}
                  className="w-20 h-20 object-cover rounded border"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center">
                  <span className="text-xs text-center p-1">{file.name}</span>
                </div>
              )}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 w-6 h-6 p-0"
                onClick={() => handleRemoveAttachment(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {gifAttachments.map((gif, index) => (
            <div key={`gif-${index}`} className="relative">
              <Image
                src={gif.url}
                alt={gif.fileName}
                width={80}
                height={80}
                className="w-20 h-20 object-cover rounded border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 w-6 h-6 p-0"
                onClick={() => handleRemoveGifAttachment(index)}
              >
                <X className="w-3 h-3" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-foreground text-xs px-1 py-0.5 rounded-b">
                GIF
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.entries(linkPreviews).map(([url, preview]) => (
        <div key={url} className="border rounded p-3 bg-muted/50">
          <div className="text-sm font-medium">{preview.title}</div>
          <div className="text-xs text-muted-foreground">
            {preview.description}
          </div>
          <div className="text-xs text-blue-600">{url}</div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <Smile className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <EmojiPicker onEmojiClick={handleEmojiSelect} />
            </PopoverContent>
          </Popover>

          <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <ImageIcon className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <GifPicker
                onGifSelect={(gifUrl) => {
                  if (attachments.length + gifAttachments.length >= 5) {
                    toast.error("Maximum 5 attachments allowed per comment");
                    return;
                  }

                  const gifAttachment: AttachmentType = {
                    id: crypto.randomUUID(),
                    type: "gif",
                    url: gifUrl,
                    fileName: "giphy.gif",
                    fileSize: 0,
                    mimeType: "image/gif",
                  };

                  setGifAttachments((prev) => [...prev, gifAttachment]);
                  setShowGifPicker(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Posting..." : "Post"}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
