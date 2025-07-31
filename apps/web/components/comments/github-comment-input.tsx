"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Button } from "@/web/components/ui/button";
import { Textarea } from "@/web/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/web/components/ui/avatar";
import { MarkdownRenderer } from "@/web/components/posts/markdown-renderer";
import {
  Bold,
  Italic,
  Link,
  ListOrdered,
  List,
  Code,
  Quote,
  Paperclip,
  FileCode,
} from "lucide-react";
import {
  uploadMedia,
  validateMediaFile,
  getFilePreviewUrl,
} from "@/lib/upload-media";

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

interface GitHubCommentInputProps {
  placeholder?: string;
  onSubmit: (content: string, attachments?: AttachmentType[]) => void;
  isSubmitting: boolean;
  className?: string;
  replyingTo?: { username: string } | null;
  onCancelReply?: () => void;
  initialValue?: string;
  initialAttachments?: AttachmentType[];
}

export function GitHubCommentInput({
  placeholder = "Use Markdown to format your comment",
  onSubmit,
  isSubmitting,
  className = "",
  replyingTo,
  onCancelReply,
  initialValue = "",
  initialAttachments = [],
}: GitHubCommentInputProps) {
  const [content, setContent] = useState(initialValue);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [attachments, setAttachments] =
    useState<AttachmentType[]>(initialAttachments);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const convex = useConvex();

  const currentMember = useQuery(api.members.getCurrentMember);

  const insertMarkdown = useCallback(
    (before: string, after: string = "") => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);
      const replacement = `${before}${selectedText}${after}`;

      const newContent =
        content.substring(0, start) + replacement + content.substring(end);

      setContent(newContent);

      // Set cursor position
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + before.length;
        textarea.setSelectionRange(
          newPosition,
          newPosition + selectedText.length,
        );
      }, 0);
    },
    [content],
  );

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(200, textareaRef.current.scrollHeight)}px`;
    }
  }, [content]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const validation = validateMediaFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          continue;
        }

        await getFilePreviewUrl(file);
        const uploadResult = await uploadMedia(convex, file);

        const attachment: AttachmentType = {
          id: crypto.randomUUID(),
          type: file.type.startsWith("image/") ? "image" : "document",
          url: uploadResult.url,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        };

        setAttachments((prev) => [...prev, attachment]);

        // Insert markdown for the attachment
        if (attachment.type === "image") {
          insertMarkdown(`\n![${file.name}](${uploadResult.url})\n`);
        } else {
          insertMarkdown(`\n[${file.name}](${uploadResult.url})\n`);
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = useCallback(() => {
    if (!content.trim() && attachments.length === 0) return;
    onSubmit(content.trim(), attachments.length > 0 ? attachments : undefined);
    // Only reset if not in edit mode (no initial value)
    if (!initialValue) {
      setContent("");
      setAttachments([]);
    }
  }, [
    content,
    attachments,
    onSubmit,
    initialValue,
    setContent,
    setAttachments,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!textareaRef.current || activeTab !== "write") return;

      const isMac = navigator.userAgent.includes("Mac");
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            insertMarkdown("**", "**");
            break;
          case "i":
            e.preventDefault();
            insertMarkdown("*", "*");
            break;
          case "k":
            e.preventDefault();
            insertMarkdown("[", "](url)");
            break;
          case "e":
            e.preventDefault();
            insertMarkdown("`", "`");
            break;
          case "j":
            e.preventDefault();
            // Insert code block
            const textarea = textareaRef.current;
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const selectedText = content.substring(start, end);
              const codeBlock = `\`\`\`\n${selectedText || "code"}\n\`\`\``;
              const newContent =
                content.substring(0, start) +
                codeBlock +
                content.substring(end);
              setContent(newContent);
              setTimeout(() => {
                // Position cursor inside code block
                const newPos = start + 4;
                textarea.setSelectionRange(
                  newPos,
                  newPos + (selectedText.length || 4),
                );
                textarea.focus();
              }, 0);
            }
            break;
          case "enter":
            e.preventDefault();
            handleSubmit();
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, insertMarkdown, content, handleSubmit]);

  return (
    <div className={cn("flex gap-3", className)}>
      {/* Avatar */}
      <Avatar className="h-10 w-10">
        {/* Display member avatar if available */}
        {currentMember?.avatarUrl && (
          <AvatarImage
            src={currentMember.avatarUrl}
            alt={currentMember.firstName || ""}
          />
        )}
        <AvatarFallback className="text-sm">
          {currentMember?.firstName?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>

      {/* Comment Box */}
      <div className="bg-background flex-1 overflow-hidden rounded-none border">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "write"
                ? "border-primary text-foreground border-b-2"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("write")}
          >
            Write
          </button>
          <button
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "preview"
                ? "border-primary text-foreground border-b-2"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("preview")}
          >
            Preview
          </button>

          {/* Toolbar */}
          {activeTab === "write" && (
            <div className="ml-auto flex items-center gap-1 px-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => insertMarkdown("**", "**")}
                title="Bold (Cmd+B)"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => insertMarkdown("*", "*")}
                title="Italic (Cmd+I)"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => insertMarkdown("[", "](url)")}
                title="Link (Cmd+K)"
              >
                <Link className="h-4 w-4" />
              </Button>
              <div className="bg-border mx-1 h-5 w-px" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => insertMarkdown("- ")}
                title="Bulleted list"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => insertMarkdown("1. ")}
                title="Numbered list"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              <div className="bg-border mx-1 h-5 w-px" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => insertMarkdown("`", "`")}
                title="Inline code (Cmd+E)"
              >
                <Code className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const textarea = textareaRef.current;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = content.substring(start, end);
                    const codeBlock = `\`\`\`\n${selectedText || "code"}\n\`\`\``;
                    const newContent =
                      content.substring(0, start) +
                      codeBlock +
                      content.substring(end);
                    setContent(newContent);
                    setTimeout(() => {
                      const newPos = start + 4;
                      textarea.setSelectionRange(
                        newPos,
                        newPos + (selectedText.length || 4),
                      );
                      textarea.focus();
                    }, 0);
                  }
                }}
                title="Code block (Cmd+J)"
              >
                <FileCode className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => insertMarkdown("> ")}
                title="Quote"
              >
                <Quote className="h-4 w-4" />
              </Button>
              <div className="bg-border mx-1 h-5 w-px" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4">
          {activeTab === "write" ? (
            <Textarea
              ref={textareaRef}
              placeholder={placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="placeholder:text-muted-foreground min-h-[200px] resize-none border-0 p-0 font-mono text-sm focus:ring-0"
              style={{ outline: "none", boxShadow: "none" }}
              onKeyDown={(e) => {
                // Tab key behavior
                if (e.key === "Tab") {
                  e.preventDefault();
                  const textarea = e.currentTarget;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;

                  // Check if we're inside a code block
                  const beforeCursor = content.substring(0, start);

                  // Count ``` before cursor
                  const codeBlocksBefore = (beforeCursor.match(/```/g) || [])
                    .length;
                  const isInCodeBlock = codeBlocksBefore % 2 === 1;

                  if (isInCodeBlock) {
                    // Inside code block - use 4 spaces for proper indentation
                    const spaces = "    ";
                    if (e.shiftKey) {
                      // Shift+Tab - outdent
                      const lineStart =
                        content.lastIndexOf("\n", start - 1) + 1;
                      const lineContent = content.substring(lineStart, start);
                      if (lineContent.startsWith(spaces)) {
                        const newContent =
                          content.substring(0, lineStart) +
                          content.substring(lineStart + spaces.length);
                        setContent(newContent);
                        setTimeout(() => {
                          if (textareaRef.current) {
                            const newPos = start - spaces.length;
                            textareaRef.current.selectionStart =
                              textareaRef.current.selectionEnd = newPos;
                          }
                        }, 0);
                      }
                    } else {
                      // Tab - indent with 4 spaces
                      const newContent =
                        content.substring(0, start) +
                        spaces +
                        content.substring(end);
                      setContent(newContent);
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart =
                            textareaRef.current.selectionEnd =
                              start + spaces.length;
                        }
                      }, 0);
                    }
                  } else {
                    // Outside code block - use 2 spaces
                    const spaces = "  ";
                    const newContent =
                      content.substring(0, start) +
                      spaces +
                      content.substring(end);
                    setContent(newContent);
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.selectionStart =
                          textareaRef.current.selectionEnd =
                            start + spaces.length;
                      }
                    }, 0);
                  }
                }
              }}
            />
          ) : (
            <div className="min-h-[200px]">
              {content ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p className="text-muted-foreground">Nothing to preview</p>
              )}
            </div>
          )}
        </div>

        {/* Submit button below content */}
        <div className="flex justify-end px-4 pb-3">
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting || (!content.trim() && attachments.length === 0)
            }
            size="sm"
          >
            {isSubmitting ? "Posting..." : "Comment"}
          </Button>
        </div>

        {/* Footer */}
        <div className="bg-muted/50 text-muted-foreground flex items-center justify-between px-4 py-2 text-xs">
          <span>
            <Paperclip className="mr-1 inline h-3 w-3" />
            Paste, drop, or click to add files
          </span>

          {replyingTo && onCancelReply && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.md"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
