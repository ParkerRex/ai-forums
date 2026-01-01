"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useConsoleLogger } from "@/hooks/use-console-branding";

export function ConsoleBranding() {
  const { isAuthenticated, user } = useAuth();
  const { logBranding, logAuthEvent } = useConsoleLogger();

  // Display branding once on mount
  useEffect(() => {
    logBranding();

    // Log initial auth state
    logAuthEvent("session_initialized", {
      isSignedIn: isAuthenticated,
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });
  }, [logBranding, logAuthEvent, isAuthenticated, user?.id]);

  // Log auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      logAuthEvent("user_signed_in", {
        isSignedIn: true,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });
    } else {
      logAuthEvent("user_signed_out", {
        isSignedIn: false,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isAuthenticated, user?.id, logAuthEvent]);

  // This component only handles console output
  return null;
}
