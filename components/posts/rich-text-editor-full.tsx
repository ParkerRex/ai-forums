"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import {
  LinkBadge,
  Mention,
  createMentionSuggestion,
} from "@/components/posts/rich-text/extensions";
import { useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Undo,
  Redo,
} from "lucide-react";

interface FullRichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

export function FullRichTextEditor({
  content = "",
  onChange,
  placeholder = "Start writing your post...",
  className = "",
}: FullRichTextEditorProps) {
  const fetchLinkPreview = useAction(api.linkPreviews.fetchLinkPreview);
  const convex = useConvex();

  const searchMembers = async (term: string) => {
    try {
      if (!term || term.length === 0) {
        // Show all active members when no search term (when user just types @)
        const members = await convex.query(api.members.getAllMembers, {});
        return members.slice(0, 20); // Limit to first 20 for performance
      }

      // Search members when user types after @
      const members = await convex.query(api.members.searchMembers, {
        searchTerm: term,
        limit: 20, // Increased from 10 to 20 for better selection
      });
      return members || [];
    } catch (error) {
      console.error("Error searching members:", error);
      return [];
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable the default code block to use our custom one
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "hljs",
        },
        languageClassPrefix: "language-",
        defaultLanguage: "javascript",
      }),
      LinkBadge.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "link-badge-mark",
        },
        fetchPreview: async (url: string) => {
          try {
            const preview = await fetchLinkPreview({ url });
            return preview;
          } catch (error) {
            console.warn("Failed to fetch link preview:", error);
            return null;
          }
        },
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: createMentionSuggestion(searchMembers),
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      try {
        const markdown =
          editor.storage.markdown?.getMarkdown?.() || editor.getHTML();
        onChange?.(markdown);
      } catch {
        // Fallback to HTML if markdown extension isn't ready
        onChange?.(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] px-4 py-3",
        placeholder,
      },
    },
  });

  if (!editor) {
    return (
      <div className={`rounded-none border ${className}`}>
        <div className="bg-muted rounded-t-lg border border-b p-2">
          <div className="flex items-center justify-center">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
            <span className="text-muted-foreground text-sm">
              Loading editor...
            </span>
          </div>
        </div>
        <div className="min-h-[200px] p-4">
          <div className="animate-pulse space-y-2">
            <div className="bg-muted h-4 w-3/4 rounded opacity-50" />
            <div className="bg-muted h-4 w-1/2 rounded opacity-50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-none border focus-within:border-green-700 focus-within:ring-1 focus-within:ring-green-700 ${className}`}
    >
      {/* Toolbar */}
      <div className="bg-muted rounded-t-lg border border-b p-2">
        <div className="flex flex-wrap gap-1 overflow-x-auto">
          {/* Undo/Redo */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 w-8 p-0"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <div className="bg-muted mx-1 h-6 w-px opacity-60" />

          {/* Text formatting */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-8 w-8 p-0 ${editor.isActive("bold") ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}`}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-8 w-8 p-0 ${editor.isActive("italic") ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}`}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`h-8 w-8 p-0 ${editor.isActive("code") ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}`}
          >
            <Code className="h-4 w-4" />
          </Button>

          <div className="bg-muted mx-1 h-6 w-px opacity-60" />

          {/* Lists */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`h-8 w-8 p-0 ${editor.isActive("bulletList") ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}`}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`h-8 w-8 p-0 ${editor.isActive("orderedList") ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}`}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="bg-muted mx-1 h-6 w-px opacity-60" />

          {/* Block elements */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`h-8 w-8 p-0 ${editor.isActive("blockquote") ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}`}
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`h-8 w-8 p-0 ${editor.isActive("codeBlock") ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}`}
            title="Code Block"
          >
            <Code2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <EditorContent
          editor={editor}
          className="min-h-[200px] focus-within:outline-none"
        />
        {!content && (
          <div className="text-muted-foreground pointer-events-none absolute left-4 top-4 opacity-70">
            {placeholder}
          </div>
        )}
      </div>

      {/* Styles for LinkBadge marks */}
      <style jsx>{`
        :global(.link-badge-mark) {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          background-color: hsl(var(--muted) / 0.5);
          border: 1px solid hsl(var(--border) / 0.5);
          border-radius: calc(var(--radius) - 2px);
          color: hsl(var(--foreground));
          text-decoration: none;
          transition: all 0.2s ease;
        }

        :global(.link-badge-mark:hover) {
          background-color: hsl(var(--muted) / 0.8);
          border-color: hsl(var(--border));
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        :global(.link-badge-mark::before) {
          content: "🔗";
          font-size: 0.75rem;
          opacity: 0.7;
        }

        :global(.mention) {
          background-color: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-weight: 500;
          text-decoration: none;
        }

        :global(.mention:hover) {
          background-color: hsl(var(--primary) / 0.2);
        }
      `}</style>
    </div>
  );
}

export default FullRichTextEditor;
