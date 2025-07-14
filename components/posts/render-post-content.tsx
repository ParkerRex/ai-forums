"use client";

import DOMPurify from 'dompurify';
import { LinkBadge } from '@/components/posts/link-badge';
import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';

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

export function RenderPostContent({ content, linkPreviews = {} }: RenderPostContentProps) {
  // Split content into paragraphs
  const paragraphs = content.split(/\n\s*\n/);
  
  return (
    <div className="prose prose-sm max-w-none text-foreground post-content">
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
      </LinkBadge>
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
  const isHtml = content.trim().startsWith('<') || /<[^>]+>/.test(content);
  
  useEffect(() => {
    if (contentRef.current && isHtml) {
      // Apply syntax highlighting to all code blocks
      const codeBlocks = contentRef.current.querySelectorAll('pre code');
      codeBlocks.forEach((block) => {
        // Only highlight if not already highlighted
        if (!block.classList.contains('hljs')) {
          hljs.highlightElement(block as HTMLElement);
        }
      });
      
      // Add copy buttons to code blocks
      const preBlocks = contentRef.current.querySelectorAll('pre');
      preBlocks.forEach((pre) => {
        if (!pre.querySelector('.copy-button')) {
          const code = pre.querySelector('code');
          if (code) {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-1 rounded bg-muted hover:bg-muted/80 border border-border/50';
            copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            copyButton.onclick = async () => {
              const text = code.textContent || '';
              try {
                await navigator.clipboard.writeText(text);
                copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                setTimeout(() => {
                  copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                }, 2000);
              } catch (err) {
                console.error('Failed to copy:', err);
              }
            };
            pre.style.position = 'relative';
            pre.appendChild(copyButton);
          }
        }
      });
    }
  }, [content, isHtml]);
  
  if (isHtml) {
    const sanitizedHtml = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-link-badge', 'data-preview-title', 'data-preview-description', 'data-language']
    });
    
    return (
      <>
        <div 
          ref={contentRef}
          className="prose prose-sm max-w-none text-foreground post-content"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
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