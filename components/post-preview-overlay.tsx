"use client";

import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";

interface PostPreviewOverlayProps {
  onUpgradeClick: () => void;
  memberCount?: number;
}

export function PostPreviewOverlay({
  onUpgradeClick,
  memberCount = 2000,
}: PostPreviewOverlayProps) {
  return (
    <div className="relative">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none" />

      {/* CTA Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute bottom-0 left-0 right-0 p-6 text-center pointer-events-none"
      >
        <div className="max-w-md mx-auto space-y-4 pointer-events-auto">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>

          <h3 className="text-xl font-semibold">
            This content is for VAI Pro members
          </h3>

          <p className="text-muted-foreground">
            Join {memberCount.toLocaleString()}+ AI engineers getting insights
            on building with AI
          </p>

          <Button
            size="lg"
            onClick={onUpgradeClick}
            className="w-full sm:w-auto"
          >
            Upgrade to VAI Pro - $99/mo
          </Button>

          <p className="text-xs text-muted-foreground">
            Cancel anytime • 30-day money-back guarantee
          </p>
        </div>
      </motion.div>
    </div>
  );
}
