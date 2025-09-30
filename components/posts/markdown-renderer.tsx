"use client";

import { useEffect, useState } from "react";
import type { Options } from "rehype-pretty-code";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { toast } from "sonner";
import { unified } from "unified";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
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
  transformers: [
    {
      pre(node) {
        // Add copy button container
        this.addClassToHast(node, "group relative");
      },
    },
  ],
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const [processedContent, setProcessedContent] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processMarkdown = async () => {
      try {
        const file = await unified()
          .use(remarkParse)
          .use(remarkRehype)
          .use(rehypePrettyCode, prettycodeOptions)
          .use(rehypeStringify)
          .process(content);

        setProcessedContent(String(file));
      } catch (error) {
        console.error("Failed to process markdown:", error);
        // Fallback to raw content
        setProcessedContent(content);
      } finally {
        setIsProcessing(false);
      }
    };

    processMarkdown();
  }, [content]);

  // Add copy functionality to code blocks after render
  useEffect(() => {
    if (!processedContent) return;

    const copyButtons = document.querySelectorAll(".markdown-content pre");
    copyButtons.forEach((pre) => {
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

      pre.appendChild(button);
    });
  }, [processedContent]);

  if (isProcessing) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
        <div className="mb-2 h-4 w-1/2 rounded bg-gray-200"></div>
        <div className="h-4 w-5/6 rounded bg-gray-200"></div>
      </div>
    );
  }

  return (
    <div
      className={cn("markdown-content prose prose-sm dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}
