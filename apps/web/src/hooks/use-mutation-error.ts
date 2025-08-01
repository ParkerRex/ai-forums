"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { processError, retryWithBackoff } from "@/lib/error-utils";
import { useNetworkStatus } from "./use-network-status";

export interface MutationErrorOptions {
  context?: string;
  maxRetries?: number;
  showToast?: boolean;
}

/**
 * Hook to handle mutation errors with toast notifications and retry functionality
 */
export function useMutationError() {
  const { isOnline } = useNetworkStatus();

  const handleMutationError = useCallback(
    (
      error: unknown,
      retryFn?: () => Promise<void>,
      options: MutationErrorOptions = {}
    ) => {
      const {
        context = "performing action",
        maxRetries = 3,
        showToast = true,
      } = options;

      const processedError = processError(error, context);

      // Don't show toast if offline and it's a network error
      if (!isOnline && processedError.type === "network") {
        return;
      }

      if (showToast) {
        // Show error toast with retry button if retry function is provided
        if (retryFn && processedError.canRetry) {
          toast.error(processedError.message, {
            action: {
              label: "Retry",
              onClick: async () => {
                try {
                  await retryWithBackoff(retryFn, maxRetries);
                  toast.success("Action completed successfully");
                } catch (retryError) {
                  // If retry fails, show another error toast without retry option
                  const retryProcessedError = processError(retryError, context);
                  toast.error(`Failed after ${maxRetries} attempts: ${retryProcessedError.message}`);
                }
              },
            },
            duration: 10000, // Keep error toasts longer
          });
        } else {
          // Show simple error toast without retry
          toast.error(processedError.message, {
            duration: 8000,
          });
        }
      }
    },
    [isOnline]
  );

  const handleMutationSuccess = useCallback((message: string = "Action completed successfully") => {
    toast.success(message, {
      duration: 4000,
    });
  }, []);

  return {
    handleMutationError,
    handleMutationSuccess,
  };
} 