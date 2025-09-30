"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useConsoleLogger } from "@/hooks/use-console-branding";

export function ConsoleBranding() {
  const { isSignedIn, user } = useUser();
  const { logBranding, logAuthEvent } = useConsoleLogger();

  // Display branding once on mount
  useEffect(() => {
    logBranding();

    // Log initial auth state
    logAuthEvent("session_initialized", {
      isSignedIn: !!isSignedIn,
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });
  }, [logBranding, logAuthEvent, isSignedIn, user?.id]);

  // Log auth state changes
  useEffect(() => {
    if (isSignedIn) {
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
  }, [isSignedIn, user?.id, logAuthEvent]);

  // This component only handles console output
  return null;
}
