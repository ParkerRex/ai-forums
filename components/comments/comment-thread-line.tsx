"use client";

import type React from "react";
import { cn } from "@/lib/utils";

interface CommentThreadLineProps {
  /** Comment nesting depth (0 = top level, 1+ = nested) */
  depth: number;
  /** Whether this is the last child in its parent's replies */
  isLastChild?: boolean;
  /** Whether to show the threading lines */
  showLines?: boolean;
  /** Custom className for styling */
  className?: string;
}

/**
 * CommentThreadLine Component
 *
 * Renders Reddit-style comment threading lines that visually connect
 * parent comments to their replies using CSS pseudo-elements.
 *
 * Features:
 * - Vertical lines connecting parent to child comments
 * - Horizontal connectors branching to child avatars
 * - Responsive design with mobile optimization
 * - Accessibility-friendly (decorative only)
 */
export const CommentThreadLine: React.FC<CommentThreadLineProps> = ({
  depth,
  isLastChild = false,
  showLines = true,
  className,
}) => {
  // Don't render lines for top-level comments
  if (depth === 0 || !showLines) {
    return null;
  }

  return (
    <div className={cn("absolute pointer-events-none select-none", className)} aria-hidden="true">
      {/* Vertical line from parent comment */}
      <div
        className={cn(
          "absolute border-l-2 border-muted/40",
          // Position the line to the left of the comment
          "left-[-20px] top-0",
          // Line height extends from top to middle of current comment
          "h-6",
          // Hide line for last child to avoid extending past content
          isLastChild && "hidden",
        )}
        style={{
          // Extend line height for nested comments
          height: isLastChild ? "24px" : "100%",
        }}
      />

      {/* Horizontal connector to current comment */}
      <div
        className={cn(
          "absolute border-b-2 border-muted/40",
          // Position at avatar level (24px from top)
          "left-[-20px] top-6",
          // Width extends from vertical line to avatar
          "w-4",
          // Responsive width adjustments
          "sm:w-5",
        )}
      />

      {/* Additional vertical lines for deeper nesting levels */}
      {depth > 1 &&
        Array.from({ length: depth - 1 }, (_, index) => (
          <div
            key={index}
            className="absolute border-l-2 border-muted/20 top-0 h-full"
            style={{
              left: `${-20 - (index + 1) * 24}px`,
            }}
          />
        ))}
    </div>
  );
};

/**
 * CommentThreadContainer Component
 *
 * Wrapper component that provides the relative positioning context
 * for CommentThreadLine components and handles responsive indentation.
 */
interface CommentThreadContainerProps {
  /** Comment nesting depth */
  depth: number;
  /** Whether this is the last child in its parent's replies */
  isLastChild?: boolean;
  /** Children to render inside the container */
  children: React.ReactNode;
  /** Custom className for styling */
  className?: string;
}

export const CommentThreadContainer: React.FC<CommentThreadContainerProps> = ({
  depth,
  isLastChild = false,
  children,
  className,
}) => {
  // Calculate responsive indentation
  const getIndentation = () => {
    const baseIndent = 24; // 24px per level on desktop
    const mobileIndent = 16; // 16px per level on mobile

    return {
      desktop: Math.min(depth, 5) * baseIndent, // Max 5 levels
      mobile: Math.min(depth, 3) * mobileIndent, // Max 3 levels on mobile
    };
  };

  const indentation = getIndentation();

  return (
    <div
      className={cn("relative", className)}
      style={{
        // Use mobile indentation by default, desktop handled by CSS
        marginLeft: `${indentation.mobile}px`,
      }}
    >
      {/* Threading lines */}
      <CommentThreadLine depth={depth} isLastChild={isLastChild} showLines={depth > 0} />

      {/* Comment content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

/**
 * Utility function to determine if a comment is the last child
 * in its parent's replies array.
 */
export const isLastChildComment = (commentIndex: number, totalSiblings: number): boolean => {
  return commentIndex === totalSiblings - 1;
};

/**
 * Utility function to calculate the maximum safe nesting depth
 * based on screen size and content width.
 */
export const getMaxNestingDepth = (screenWidth: number): number => {
  if (screenWidth < 640) return 3; // Mobile
  if (screenWidth < 1024) return 4; // Tablet
  return 5; // Desktop
};
