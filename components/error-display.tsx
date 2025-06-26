"use client";

import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { processError } from "@/lib/error-utils";
import { useNetworkStatus } from "@/hooks/use-network-status";

interface ErrorDisplayProps {
  error: unknown;
  context?: string;
  onRetry?: () => void;
  className?: string;
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
 * Inline error display for smaller spaces
 */
export function InlineErrorDisplay({ error, context, onRetry }: ErrorDisplayProps) {
  const processedError = processError(error, context);
  const { isOnline } = useNetworkStatus();

  return (
    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-center">
        <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
        <span className="text-sm text-red-800">{processedError.message}</span>
      </div>

      {onRetry && processedError.canRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          disabled={!isOnline && processedError.type === "network"}
          className="text-red-700 hover:text-red-800 hover:bg-red-100"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
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
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600">{processedError.message}</p>
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
                <WifiOff className="h-4 w-4 mr-2 text-red-600" />
                <span className="text-red-600">You&apos;re offline</span>
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
    <div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-md text-sm font-medium ${isOnline
      ? "bg-green-100 text-green-800 border border-green-200"
      : "bg-red-100 text-red-800 border border-red-200"
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