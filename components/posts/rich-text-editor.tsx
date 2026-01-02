"use client";

import { Wand2 } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Lazy load the full rich text editor
const FullRichTextEditor = lazy(() => import("./rich-text-editor-full"));

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

// Loading skeleton for the full editor
function RichEditorSkeleton() {
  return (
    <div className="rounded-none border">
      <div className="bg-muted rounded-t-lg border border-b p-2">
        <div className="flex items-center justify-center">
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
          <span className="text-muted-foreground text-sm">Loading rich editor...</span>
        </div>
      </div>
      <div className="min-h-[200px] p-4">
        <div className="animate-pulse space-y-2">
          <div className="bg-muted h-4 w-3/4 rounded-sm opacity-50" />
          <div className="bg-muted h-4 w-1/2 rounded-sm opacity-50" />
        </div>
      </div>
    </div>
  );
}

export function RichTextEditor({
  content = "",
  onChange,
  placeholder = "Start writing your post...",
  className = "",
}: RichTextEditorProps) {
  const [useRichEditor, setUseRichEditor] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle textarea changes
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value);
    },
    [onChange],
  );

  // Upgrade to rich editor
  const handleUpgrade = useCallback(() => {
    setUseRichEditor(true);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && !useRichEditor) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(200, textarea.scrollHeight)}px`;
    }
  }, [content, useRichEditor]);

  // Use rich editor if requested
  if (useRichEditor) {
    return (
      <Suspense fallback={<RichEditorSkeleton />}>
        <FullRichTextEditor
          content={content}
          onChange={onChange}
          placeholder={placeholder}
          className={className}
        />
      </Suspense>
    );
  }

  // Simple mode (fast loading)
  return (
    <div
      className={`rounded-none border focus-within:border-green-700 focus-within:ring-1 focus-within:ring-green-700 ${className}`}
    >
      {/* Simple toolbar */}
      <div className="bg-muted rounded-t-lg border border-b p-2">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">Markdown supported</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUpgrade}
            className="text-green-700 hover:bg-green-50 hover:text-green-800"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Rich Editor
          </Button>
        </div>
      </div>

      {/* Simple textarea */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          placeholder={placeholder}
          className="min-h-[200px] resize-none rounded-t-none border-0 focus-visible:ring-0"
        />
      </div>
    </div>
  );
}

export default RichTextEditor;
