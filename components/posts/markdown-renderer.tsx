"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import hljs from "highlight.js";
import { useEffect } from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  // Apply syntax highlighting after render
  useEffect(() => {
    // Find all code blocks that need highlighting
    const blocks = document.querySelectorAll("pre code:not(.hljs)");
    blocks.forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });
  }, [content]);

  return (
    <div
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
    >
      <ReactMarkdown
        components={{
          // Code blocks with syntax highlighting
          pre: ({ children, ...props }) => {
            const codeElement = children as React.ReactElement<{
              className?: string;
              children?: React.ReactNode;
            }>;
            const className = codeElement?.props?.className || "";
            const match = /language-(\w+)/.exec(className);
            const language = match ? match[1] : "";

            return (
              <div className="group relative">
                {language && (
                  <div className="text-muted-foreground bg-muted absolute right-0 top-0 rounded-bl px-2 py-1 text-xs">
                    {language}
                  </div>
                )}
                <pre
                  className="bg-muted hljs overflow-x-auto rounded-none p-4"
                  {...props}
                >
                  {children}
                </pre>
                <button
                  className="bg-background/80 hover:bg-background absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => {
                    const code = codeElement?.props?.children;
                    if (code && typeof code === "string") {
                      navigator.clipboard.writeText(code);
                    }
                  }}
                  title="Copy code"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            );
          },
          code: ({ children, className, ...props }) => {
            // Check if this is an inline code or code block
            const isInline = !className;

            if (isInline) {
              return (
                <code
                  className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // For code blocks, detect language and apply highlighting
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            // Try to detect language if not specified
            let highlightedCode = children as string;
            if (typeof children === "string") {
              if (language) {
                try {
                  highlightedCode = hljs.highlight(children, {
                    language,
                  }).value;
                } catch {
                  // If language is not supported, try auto-detection
                  highlightedCode = hljs.highlightAuto(children).value;
                }
              } else {
                // Auto-detect language
                highlightedCode = hljs.highlightAuto(children).value;
              }
            }

            return (
              <code
                className={cn("font-mono text-sm", className)}
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
                {...props}
              />
            );
          },
          // Links
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              {...props}
            >
              {children}
            </a>
          ),
          // Blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-muted-foreground/30 border-l-4 pl-4 italic"
              {...props}
            >
              {children}
            </blockquote>
          ),
          // Lists
          ul: ({ children, ...props }) => (
            <ul className="list-inside list-disc space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-inside list-decimal space-y-1" {...props}>
              {children}
            </ol>
          ),
          // Headings
          h1: ({ children, ...props }) => (
            <h1 className="mb-2 mt-4 text-2xl font-bold" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="mb-2 mt-3 text-xl font-bold" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="mb-1 mt-2 text-lg font-bold" {...props}>
              {children}
            </h3>
          ),
          // Paragraphs
          p: ({ children, ...props }) => (
            <p className="mb-2" {...props}>
              {children}
            </p>
          ),
          // Horizontal rule
          hr: ({ ...props }) => (
            <hr className="border-border my-4" {...props} />
          ),
          // Tables
          table: ({ children, ...props }) => (
            <table
              className="border-border my-2 border-collapse border"
              {...props}
            >
              {children}
            </table>
          ),
          th: ({ children, ...props }) => (
            <th
              className="border-border bg-muted border px-2 py-1 font-medium"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border-border border px-2 py-1" {...props}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
