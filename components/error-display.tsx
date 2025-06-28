"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { processError } from "@/lib/error-utils";
import { useNetworkStatus } from "@/hooks/use-network-status";

export interface ErrorInfo {
  type: "network" | "server" | "validation" | "unknown";
  message: string;
  canRetry: boolean;
  details?: string;
}

export interface ErrorDisplayProps {
  error: Error | string;
  context?: string;
  onRetry?: () => void;
  variant?: "inline" | "banner" | "fullPage";
}

/**
 * Generic error display component using Alert
 */
export function ErrorDisplay({ error, context, onRetry, className }: ErrorDisplayProps) {
  const processedError = processError(error, context);
  const { isOnline } = useNetworkStatus();

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {processedError.type === "network" ? "Connection Error" : "Error"}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{processedError.message}</p>

        {/* Network status indicator */}
        {processedError.type === "network" && (
          <div className="flex items-center mb-3 text-sm">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 mr-2 text-green-600" />
                <span className="text-green-600">Connection restored</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 mr-2 text-red-600" />
                <span className="text-red-600">You&apos;re offline</span>
              </>
            )}
          </div>
        )}

        {/* Retry button */}
        {onRetry && processedError.canRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={!isOnline && processedError.type === "network"}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Process error and determine display information
 */
export function processError(error: Error | string, context?: string): ErrorInfo {
  const errorMessage = typeof error === "string" ? error : error.message;
  const errorName = typeof error === "string" ? "" : error.name;

  // Network errors
  if (
    errorMessage.includes("fetch") ||
    errorMessage.includes("network") ||
    errorMessage.includes("offline") ||
    errorName === "NetworkError"
  ) {
    return {
      type: "network",
      message: "Unable to connect. Please check your internet connection.",
      canRetry: true,
      details: context ? `Context: ${context}` : undefined,
    };
  }

  // Server errors
  if (
    errorMessage.includes("500") ||
    errorMessage.includes("502") ||
    errorMessage.includes("503") ||
    errorMessage.includes("504") ||
    errorName === "ServerError"
  ) {
    return {
      type: "server",
      message: "Server is temporarily unavailable. Please try again later.",
      canRetry: true,
      details: context ? `Context: ${context}` : undefined,
    };
  }

  // Validation errors
  if (
    errorMessage.includes("validation") ||
    errorMessage.includes("invalid") ||
    errorName === "ValidationError"
  ) {
    return {
      type: "validation",
      message: errorMessage || "Please check your input and try again.",
      canRetry: false,
      details: context ? `Context: ${context}` : undefined,
    };
  }

  // Default unknown error
  return {
    type: "unknown",
    message: errorMessage || "An unexpected error occurred.",
    canRetry: true,
    details: context ? `Context: ${context}` : undefined,
  };
}

/**
 * Inline error display for forms and components
 */
export function InlineErrorDisplay({ error, context, onRetry }: ErrorDisplayProps) {
  const processedError = processError(error, context);

  return (
    <div className="rounded-md bg-destructive/10 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-destructive">
            {processedError.message}
          </h3>
          {onRetry && processedError.canRetry && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="text-destructive border-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Full page error display for major failures
 */
export function FullPageErrorDisplay({ error, context, onRetry }: ErrorDisplayProps) {
  const processedError = processError(error, context);
  const { isOnline } = useNetworkStatus();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">{processedError.message}</p>
        </div>

        {/* Network status */}
        {processedError.type === "network" && (
          <div className="flex items-center justify-center mb-6 text-sm">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 mr-2 text-green-600" />
                <span className="text-green-600">Connection restored</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 mr-2 text-destructive" />
                <span className="text-destructive">You&apos;re offline</span>
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {onRetry && processedError.canRetry && (
            <Button
              onClick={onRetry}
              disabled={!isOnline && processedError.type === "network"}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Network status indicator component
 */
export function NetworkStatusIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-md text-sm font-medium border ${isOnline
      ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      : "bg-destructive/10 text-destructive border-destructive/20"
      }`}>
      <div className="flex items-center">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 mr-2" />
            Back online
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 mr-2" />
            You&apos;re offline
          </>
        )}
      </div>
    </div>
  );
}

const NetworkStatusIndicatorNew = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        flex items-center px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform
        ${isOnline 
          ? "bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary" 
          : "bg-destructive/10 text-destructive border border-destructive/20 dark:bg-destructive/20 dark:text-destructive"
        }
        ${showIndicator ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}
      `}>
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 mr-2 text-primary" />
            <span className="text-primary">Connection restored</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 mr-2 text-destructive" />
            <span className="text-destructive">Connection lost</span>
          </>
        )}
      </div>
    </div>
  );
};

const NetworkStatusIndicatorNewInline = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div className={`
      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
      ${isOnline 
        ? "bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary" 
        : "bg-destructive/10 text-destructive border border-destructive/20 dark:bg-destructive/20 dark:text-destructive"
      }
    `}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 mr-2 text-primary" />
          <span className="text-primary">Connection restored</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 mr-2 text-destructive" />
          <span className="text-destructive">Connection lost</span>
        </>
      )}
    </div>
  );
};

const NetworkStatusIndicatorNewInlineSmall = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div className={`
      inline-flex items-center px-2 py-1 rounded text-xs font-medium
      ${isOnline 
        ? "bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary"
        : "bg-destructive/10 text-destructive border border-destructive/20 dark:bg-destructive/20 dark:text-destructive"
      }
    `}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 mr-2 text-primary" />
          <span className="text-primary">Connection restored</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 mr-2 text-destructive" />
          <span className="text-destructive">Connection lost</span>
        </>
      )}
    </div>
  );
}; 