"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PostContentTeaserProps {
  content?: string;
  className?: string;
}

export function PostContentTeaser({ content, className }: PostContentTeaserProps) {
  // Extract a teaser from the content (first 500 chars or first few paragraphs)
  const getTeaserContent = () => {
    if (!content) {
      // Placeholder content if no real content provided
      return `
        The key to building successful AI applications isn't just about choosing the right model or framework. 
        It's about understanding the fundamental patterns that emerge when you combine traditional software engineering 
        with machine learning capabilities.

        In this post, we'll explore how leading AI teams are structuring their applications, the common pitfalls 
        they're avoiding, and the architectural decisions that are making the difference between prototypes and 
        production-ready systems.

        We'll dive deep into real-world examples from companies like OpenAI, Anthropic, and emerging startups 
        that are pushing the boundaries of what's possible with AI...
      `;
    }

    // Get first 500 characters or up to 3 paragraphs
    const paragraphs = content.split("\n\n").slice(0, 3);
    const teaser = paragraphs.join("\n\n");

    if (teaser.length > 500) {
      return `${teaser.substring(0, 500)}...`;
    }

    return `${teaser}...`;
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Blurred content preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* Content with progressive blur-xs */}
        <div className="relative">
          <div className="prose prose-lg dark:prose-invert max-w-none post-content">
            {getTeaserContent()
              .split("\n")
              .map((paragraph, index) => (
                <p
                  key={index}
                  className={cn(
                    "mb-4 transition-all duration-500",
                    index === 0 && "blur-[0.5px]",
                    index === 1 && "blur-[1px]",
                    index === 2 && "blur-[2px]",
                  )}
                  style={{
                    maskImage:
                      index === 2
                        ? "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)"
                        : undefined,
                    WebkitMaskImage:
                      index === 2
                        ? "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)"
                        : undefined,
                  }}
                >
                  {paragraph}
                </p>
              ))}
          </div>

          {/* Animated highlight effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.1, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent skew-x-12" />
          </motion.div>
        </div>

        {/* Bottom fade overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
      </motion.div>

      {/* Teaser indicators */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="px-3 py-1 bg-primary/10 backdrop-blur-xs rounded-full border border-primary/20"
        >
          <span className="text-xs font-medium text-primary">Preview</span>
        </motion.div>
      </div>
    </div>
  );
}
