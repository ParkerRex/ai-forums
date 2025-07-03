"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  lazy,
  Suspense,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2 } from "lucide-react";

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
    <div className="border rounded-lg">
      <div className="border-b border p-2 bg-muted rounded-t-lg">
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            Loading rich editor...
          </span>
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
      textarea.style.height = Math.max(200, textarea.scrollHeight) + "px";
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
      className={`border rounded-lg focus-within:border-green-700 focus-within:ring-1 focus-within:ring-green-700 ${className}`}
    >
      {/* Simple toolbar */}
      <div className="border-b border p-2 bg-muted rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Markdown supported
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUpgrade}
            className="text-green-700 hover:text-green-800 hover:bg-green-50"
          >
            <Wand2 className="w-4 h-4 mr-2" />
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
          className="min-h-[200px] border-0 focus-visible:ring-0 resize-none rounded-t-none"
          onFocus={handleUpgrade} // Auto-upgrade when user starts typing
        />
      </div>
    </div>
  );
}

export default RichTextEditor;
