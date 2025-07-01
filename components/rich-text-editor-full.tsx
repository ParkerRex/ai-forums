"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { LinkBadge } from '@/extensions/link-badge';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo
} from 'lucide-react';


interface FullRichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function FullRichTextEditor({
  content = '',
  onChange,
  placeholder = 'Start writing your post...',
  className = ''
}: FullRichTextEditorProps) {
  const fetchLinkPreview = useAction(api.linkPreviews.fetchLinkPreview);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      LinkBadge.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'link-badge-mark',
        },
        fetchPreview: async (url: string) => {
          try {
            const preview = await fetchLinkPreview({ url });
            return preview;
          } catch (error) {
            console.warn('Failed to fetch link preview:', error);
            return null;
          }
        },
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        linkify: true,
        breaks: false,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      try {
        const markdown = editor.storage.markdown?.getMarkdown?.() || editor.getHTML();
        onChange?.(markdown);
      } catch {
        // Fallback to HTML if markdown extension isn't ready
        onChange?.(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] px-4 py-3',
        placeholder,
      },
    },
  });



  if (!editor) {
    return (
      <div className={`border border rounded-lg ${className}`}>
        <div className="border-b border p-2 bg-muted rounded-t-lg">
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading editor...</span>
          </div>
        </div>
        <div className="min-h-[200px] p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted opacity-50 rounded w-3/4" />
            <div className="h-4 bg-muted opacity-50 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border rounded-lg focus-within:border-green-700 focus-within:ring-1 focus-within:ring-green-700 ${className}`}>
      {/* Toolbar */}
      <div className="border-b border p-2 bg-muted rounded-t-lg">
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

          <div className="w-px h-6 bg-muted opacity-60 mx-1" />

          {/* Text formatting */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-green-100 text-green-700' : ''}`}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-green-100 text-green-700' : ''}`}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('code') ? 'bg-green-100 text-green-700' : ''}`}
          >
            <Code className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-muted opacity-60 mx-1" />

          {/* Lists */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-green-100 text-green-700' : ''}`}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-green-100 text-green-700' : ''}`}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-muted opacity-60 mx-1" />

          {/* Block elements */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-green-100 text-green-700' : ''}`}
          >
            <Quote className="h-4 w-4" />
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
          <div className="absolute top-4 left-4 text-muted-foreground opacity-70 pointer-events-none">
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
      `}</style>
    </div>
  );
}

export default FullRichTextEditor;  