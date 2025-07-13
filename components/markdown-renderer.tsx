"use client";

import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";
import hljs from 'highlight.js';
import { useEffect } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Apply syntax highlighting after render
  useEffect(() => {
    // Find all code blocks that need highlighting
    const blocks = document.querySelectorAll('pre code:not(.hljs)');
    blocks.forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });
  }, [content]);

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        components={{
        // Code blocks with syntax highlighting
        pre: ({ children, ...props }) => {
          const codeElement = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
          const className = codeElement?.props?.className || '';
          const match = /language-(\w+)/.exec(className);
          const language = match ? match[1] : '';
          
          return (
            <div className="relative group">
              {language && (
                <div className="absolute top-0 right-0 px-2 py-1 text-xs text-muted-foreground bg-muted rounded-bl">
                  {language}
                </div>
              )}
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto hljs" {...props}>
                {children}
              </pre>
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-background/80 hover:bg-background"
                onClick={() => {
                  const code = codeElement?.props?.children;
                  if (code && typeof code === 'string') {
                    navigator.clipboard.writeText(code);
                  }
                }}
                title="Copy code"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          }
          
          // For code blocks, detect language and apply highlighting
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          
          // Try to detect language if not specified
          let highlightedCode = children as string;
          if (typeof children === 'string') {
            if (language) {
              try {
                highlightedCode = hljs.highlight(children, { language }).value;
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
              className={cn("text-sm font-mono", className)} 
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
          <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic" {...props}>
            {children}
          </blockquote>
        ),
        // Lists
        ul: ({ children, ...props }) => (
          <ul className="list-disc list-inside space-y-1" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="list-decimal list-inside space-y-1" {...props}>
            {children}
          </ol>
        ),
        // Headings
        h1: ({ children, ...props }) => (
          <h1 className="text-2xl font-bold mt-4 mb-2" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="text-xl font-bold mt-3 mb-2" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="text-lg font-bold mt-2 mb-1" {...props}>
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
          <hr className="my-4 border-border" {...props} />
        ),
        // Tables
        table: ({ children, ...props }) => (
          <table className="border-collapse border border-border my-2" {...props}>
            {children}
          </table>
        ),
        th: ({ children, ...props }) => (
          <th className="border border-border px-2 py-1 bg-muted font-medium" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="border border-border px-2 py-1" {...props}>
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