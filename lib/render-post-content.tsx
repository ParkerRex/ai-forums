"use client";

import DOMPurify from 'dompurify';
import { LinkBadge } from '@/components/link-badge';

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
    <div className="prose prose-sm max-w-none text-foreground">
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
  // Sanitize HTML and allow our link badge classes
  const sanitizedHtml = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-link-badge', 'data-preview-title', 'data-preview-description']
  });
  
  return (
    <>
      <div 
        className="prose prose-sm max-w-none text-foreground"
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
}     