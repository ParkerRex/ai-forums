import { useCallback } from "react";
import { MISSION_STATEMENT, VAI_ASCII_ART } from "@/components/ascii-art";

interface AuthEventData {
  timestamp: string;
  isSignedIn?: boolean;
  userId?: string;
  event?: string;
}

interface TokenRefreshData {
  expiresAt: string;
  refreshedAt: string;
}

export function useConsoleLogger() {
  const isDev = process.env.NODE_ENV === "development";

  const logBranding = useCallback(() => {
    if (typeof window === "undefined") return;

    console.log(`%c${VAI_ASCII_ART}`, "color: #3b82f6; font-weight: bold; font-family: monospace;");
    console.log(`%c${MISSION_STATEMENT}`, "color: #10b981; font-size: 14px; line-height: 1.5;");
    console.log(
      "%c===== VAI-VEX Developer Console =====",
      "color: #f59e0b; font-weight: bold; font-size: 16px;",
    );
    console.log("%cVersion: 0.1.0", "color: #6b7280;");
    console.log(`%cEnvironment: ${process.env.NODE_ENV}`, "color: #6b7280;");
  }, []);

  const logAuthEvent = useCallback(
    (event: string, data: AuthEventData) => {
      if (typeof window === "undefined") return;

      const logLevel = isDev ? "log" : "debug";

      // Only include sensitive data in development
      const safeData = {
        timestamp: data.timestamp,
        event,
        isSignedIn: !!data.isSignedIn,
        ...(isDev && data.userId && { userId: data.userId }),
      };

      console[logLevel](
        `%c🔐 AUTH ${event.toUpperCase()}`,
        "color: #8b5cf6; font-weight: bold;",
        safeData,
      );
    },
    [isDev],
  );

  const logTokenRefresh = useCallback((tokenData: TokenRefreshData) => {
    if (typeof window === "undefined") return;

    console.log("%c🔄 TOKEN REFRESH", "color: #06b6d4; font-weight: bold;", {
      timestamp: new Date().toISOString(),
      expiresAt: tokenData.expiresAt,
      refreshedAt: tokenData.refreshedAt,
    });
  }, []);

  return {
    logBranding,
    logAuthEvent,
    logTokenRefresh,
  };
}
