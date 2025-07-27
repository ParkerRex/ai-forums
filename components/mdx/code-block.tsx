"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import React from "react";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  "data-language"?: string;
  "data-theme"?: string;
  [key: string]: unknown;
}

export function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function extractTextFromChildren(children: React.ReactNode): string {
    if (typeof children === "string") return children;
    if (Array.isArray(children)) {
      return children.map((child) => extractTextFromChildren(child)).join("");
    }
    if (React.isValidElement(children) && children.props) {
      const { children: nestedChildren } = children.props as {
        children?: React.ReactNode;
      };
      if (nestedChildren) {
        return extractTextFromChildren(nestedChildren);
      }
    }
    return "";
  }

  const handleCopy = async () => {
    const code = extractTextFromChildren(children);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="group relative mb-4">
      <pre className={className} {...props}>
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded-md border border-zinc-200 bg-white/80 p-2 text-zinc-600 opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

// This is now handled by rehype-pretty-code's inline code highlighting
export function InlineCode({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: unknown;
}) {
  // Simply pass through as rehype-pretty-code handles the styling
  return <code {...props}>{children}</code>;
}
