"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock, TrendingUp, Users, Clock, Eye, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { PostContentTeaser } from "./post-content-teaser";

interface PostPreviewOverlayProps {
  onUpgradeClick: () => void;
  memberCount?: number;
  viewCount?: number;
  readingTime?: number;
  postTitle?: string;
  postContent?: string;
  relatedPostsCount?: number;
  activeReaders?: number;
  className?: string;
  showContentTeaser?: boolean;
}

// Urgency messages that rotate
const URGENCY_MESSAGES = [
  "You're 30 seconds away from reading this...",
  "This is where it gets interesting...",
  "The answer you're looking for is right below...",
  "Don't miss the key insight in this post...",
  "The best part is just out of reach...",
];

// Activity messages for social proof
const ACTIVITY_MESSAGES = [
  "engineers are reading this now",
  "engineers read this yesterday", 
  "engineers bookmarked this post",
  "engineers found this helpful",
];

export function PostPreviewOverlay({
  onUpgradeClick,
  memberCount = 2000,
  viewCount = 847,
  readingTime = 5,
  postTitle,
  postContent,
  relatedPostsCount = 47,
  activeReaders = 12,
  className,
  showContentTeaser = true,
}: PostPreviewOverlayProps) {
  const [urgencyMessage, setUrgencyMessage] = useState(URGENCY_MESSAGES[0]);
  const [activityMessage] = useState(ACTIVITY_MESSAGES[0]);
  const [showAnimation, setShowAnimation] = useState(false);
  
  // Scroll-based animations
  const { scrollYProgress } = useScroll();
  const overlayOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0, 1]);
  const contentY = useTransform(scrollYProgress, [0.3, 0.5], [40, 0]);
  const scaleProgress = useTransform(scrollYProgress, [0.4, 0.6], [0.95, 1]);
  const blurAmount = useTransform(scrollYProgress, [0.2, 0.5], [0, 8]);

  // Rotate urgency messages
  useEffect(() => {
    const interval = setInterval(() => {
      setUrgencyMessage(prev => {
        const currentIndex = URGENCY_MESSAGES.indexOf(prev);
        return URGENCY_MESSAGES[(currentIndex + 1) % URGENCY_MESSAGES.length];
      });
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={cn("relative", className)}>
      {/* Blurred Content Teaser */}
      {showContentTeaser && (
        <div className="relative mb-8">
          <PostContentTeaser content={postContent} />
        </div>
      )}
      
      {/* Enhanced Gradient Overlay */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: overlayOpacity }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/98 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent" />
        
        {/* Dynamic blur effect for content underneath */}
        <motion.div 
          className="absolute inset-x-0 top-0 h-32"
          style={{
            backdropFilter: useTransform(blurAmount, (value) => `blur(${value}px)`),
            WebkitBackdropFilter: useTransform(blurAmount, (value) => `blur(${value}px)`),
          }}
        />
      </motion.div>

      {/* CTA Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showAnimation ? 1 : 0 }}
        style={{ 
          y: contentY,
          scale: scaleProgress 
        }}
        className="absolute bottom-0 left-0 right-0 p-6 text-center pointer-events-none"
      >
        <div className="max-w-lg mx-auto space-y-6 pointer-events-auto">
          {/* Urgency Indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Clock className="h-4 w-4" />
            <span className="font-medium">{urgencyMessage}</span>
          </motion.div>

          {/* Lock Icon with Pulse */}
          <motion.div 
            className="flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative p-3 bg-primary/10 rounded-full">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <h3 className="text-2xl font-bold">
              This content is for VAI Pro members
            </h3>
            
            {postTitle && (
              <p className="text-sm text-muted-foreground">
                Unlock &quot;{postTitle}&quot; and continue reading
              </p>
            )}
          </motion.div>

          {/* Social Proof with Live Activity */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            {/* Active Readers */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <Users className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{activeReaders}</span> {activityMessage}
              </span>
            </div>

            {/* View Count */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{viewCount.toLocaleString()} views</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{readingTime} min read</span>
              </div>
            </div>
          </motion.div>

          {/* CTA Button with Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              size="lg"
              onClick={onUpgradeClick}
              className="relative w-full sm:w-auto group overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Get instant access - $99/mo
                <TrendingUp className="h-4 w-4" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </Button>
          </motion.div>

          {/* Additional Benefits */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="space-y-2"
          >
            <p className="text-sm text-muted-foreground">
              Join <span className="font-semibold text-foreground">{memberCount.toLocaleString()}+</span> AI engineers 
              inside
            </p>
            
            {relatedPostsCount > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                <p className="text-sm font-medium text-primary">
                  Plus unlock {relatedPostsCount} more posts like this
                </p>
              </motion.div>
            )}

            <p className="text-xs text-muted-foreground">
              Cancel anytime • 30-day money-back guarantee • Instant access
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Real Member Testimonial */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2, type: "spring" }}
        className="absolute left-4 bottom-32 pointer-events-none"
      >
        <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg max-w-[220px]">
          <p className="text-xs">
            <span className="font-semibold">Hari:</span> &quot;Learned more in 1 month here than 6 months of research&quot;
          </p>
          <p className="text-xs text-muted-foreground mt-1">VAI Pro member</p>
        </div>
      </motion.div>

      {/* Scroll Progress Indicator */}
      <motion.div
        className="fixed right-4 top-1/2 -translate-y-1/2 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="relative h-32 w-1 bg-muted/20 rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 right-0 bg-primary rounded-full"
            style={{ 
              height: scrollYProgress,
              scaleY: scrollYProgress,
            }}
          />
        </div>
        <motion.p 
          className="text-xs text-muted-foreground mt-2 writing-mode-vertical"
          style={{ opacity: overlayOpacity }}
        >
          Keep scrolling
        </motion.p>
      </motion.div>
    </div>
  );
}