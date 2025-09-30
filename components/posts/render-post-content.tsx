"use client";

import DOMPurify from "dompurify";
import { useEffect, useRef, useState } from "react";
import rehypeParse from "rehype-parse";
import type { Options } from "rehype-pretty-code";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import { toast } from "sonner";
import { unified } from "unified";
import { LinkBadge } from "@/components/posts/link-badge";

interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

interface RenderPostContentProps {
  content: string;
  linkPreviews?: Record<string, LinkPreview>;
}

const prettycodeOptions: Options = {
  theme: {
    dark: "github-dark-dimmed",
    light: "github-light",
  },
  keepBackground: false,
  defaultLang: {
    block: "plaintext",
    inline: "plaintext",
  },
  grid: true,
};

export function RenderPostContent({ content, linkPreviews = {} }: RenderPostContentProps) {
  // Split content into paragraphs
  const paragraphs = content.split(/\n\s*\n/);

  return (
    <div className="prose prose-sm text-foreground post-content max-w-none">
      {paragraphs.map((paragraph, index) => {
        if (!paragraph.trim()) return null;

        return (
          <p key={index} className="mb-4 leading-relaxed">
            {renderParagraphWithLinks(paragraph.trim(), linkPreviews)}
          </p>
        );
      })}
    </div>
  );
}

function renderParagraphWithLinks(text: string, linkPreviews: Record<string, LinkPreview>) {
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  // Match both markdown links and bare URLs
  const linkRegex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s]+)/g;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const linkText = match[2]; // Text from markdown link
    const markdownUrl = match[3]; // URL from markdown link
    const bareUrl = match[4]; // Bare URL

    // Add text before the link
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      elements.push(beforeText);
    }

    // Determine the URL and display text
    const url = markdownUrl || bareUrl;
    const displayText = linkText || getDisplayTextForUrl(url, linkPreviews[url]);

    // Add the LinkBadge
    elements.push(
      <LinkBadge key={`${match.index}-${url}`} href={url}>
        {displayText}
      </LinkBadge>,
    );

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements.length > 0 ? elements : text;
}

function getDisplayTextForUrl(url: string, preview?: LinkPreview): string {
  // If we have a preview with a title, use that
  if (preview?.title) {
    return preview.title;
  }

  // Otherwise, use the hostname
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// For backward compatibility, also export a function that handles HTML from TipTap
export function RenderTipTapContent({ content }: { content: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [processedContent, setProcessedContent] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const isHtml = content.trim().startsWith("<") || /<[^>]+>/.test(content);

  useEffect(() => {
    if (isHtml) {
      setIsProcessing(true);
      const processHtml = async () => {
        try {
          // First sanitize the HTML
          const sanitizedHtml = DOMPurify.sanitize(content, {
            ALLOWED_TAGS: [
              "p",
              "br",
              "strong",
              "em",
              "u",
              "s",
              "a",
              "ul",
              "ol",
              "li",
              "blockquote",
              "code",
              "pre",
              "h1",
              "h2",
              "h3",
            ],
            ALLOWED_ATTR: [
              "href",
              "target",
              "rel",
              "class",
              "data-link-badge",
              "data-preview-title",
              "data-preview-description",
              "data-language",
            ],
          });

          // Process with rehype-pretty-code
          const file = await unified()
            .use(rehypeParse, { fragment: true })
            .use(rehypePrettyCode, prettycodeOptions)
            .use(rehypeStringify)
            .process(sanitizedHtml);

          setProcessedContent(String(file));
        } catch (error) {
          console.error("Failed to process HTML:", error);
          // Fallback to sanitized content
          setProcessedContent(DOMPurify.sanitize(content));
        } finally {
          setIsProcessing(false);
        }
      };

      processHtml();
    }
  }, [content, isHtml]);

  // Add copy functionality to code blocks after render
  useEffect(() => {
    if (!contentRef.current || !processedContent) return;

    const preBlocks = contentRef.current.querySelectorAll("pre");
    preBlocks.forEach((pre) => {
      // Skip if button already exists
      if (pre.querySelector(".copy-button")) return;

      const button = document.createElement("button");
      button.className =
        "copy-button absolute right-2 top-2 rounded-md border border-zinc-200 bg-white/80 p-2 text-zinc-600 opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white";
      button.innerHTML = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>`;

      button.onclick = async () => {
        const code = pre.querySelector("code");
        if (code) {
          try {
            await navigator.clipboard.writeText(code.textContent || "");
            toast.success("Code copied to clipboard!");
            button.innerHTML = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>`;
            setTimeout(() => {
              button.innerHTML = `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>`;
            }, 2000);
          } catch {
            toast.error("Failed to copy code");
          }
        }
      };

      pre.classList.add("group", "relative");
      pre.appendChild(button);
    });
  }, [processedContent]);

  if (isHtml) {
    if (isProcessing) {
      return (
        <div className="animate-pulse">
          <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
          <div className="mb-2 h-4 w-1/2 rounded bg-gray-200"></div>
          <div className="h-4 w-5/6 rounded bg-gray-200"></div>
        </div>
      );
    }

    return (
      <>
        <div
          ref={contentRef}
          className="prose prose-sm text-foreground post-content max-w-none"
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
        <style jsx global>{`
          .link-badge-mark {
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
            cursor: pointer;
          }

          .link-badge-mark:hover {
            background-color: hsl(var(--muted) / 0.8);
            border-color: hsl(var(--border));
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .link-badge-mark::before {
            content: "🔗";
            font-size: 0.75rem;
            opacity: 0.7;
          }
        `}</style>
      </>
    );
  } else {
    return <RenderPostContent content={content} />;
  }
}
