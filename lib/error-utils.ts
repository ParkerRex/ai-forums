import { ConvexError, Value } from "convex/values";

export type ErrorType = "network" | "server" | "application" | "unknown";

export interface ProcessedError {
  type: ErrorType;
  message: string;
  originalError: Error;
  canRetry: boolean;
}

/**
 * Determines if an error is a ConvexError with structured data
 */
export function isConvexError(error: unknown): error is ConvexError<Value> {
  return error instanceof ConvexError;
}

/**
 * Determines if an error is likely a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("timeout") ||
      error.name === "NetworkError"
    );
  }
  return false;
}

/**
 * Processes any error and returns a structured error object with user-friendly message
 */
export function processError(error: unknown, context?: string): ProcessedError {
  console.error("Error occurred:", error, context ? `Context: ${context}` : "");

  // Handle ConvexError (application errors)
  if (isConvexError(error)) {
    const errorData = error.data;
    let message = "An error occurred";

    if (typeof errorData === "string") {
      message = errorData;
    } else if (typeof errorData === "object" && errorData !== null) {
      // Handle structured error data
      if ("message" in errorData && typeof errorData.message === "string") {
        message = errorData.message;
      } else if ("error" in errorData && typeof errorData.error === "string") {
        message = errorData.error;
      }
    }

    return {
      type: "application",
      message,
      originalError: error,
      canRetry: true, // Application errors might be retryable
    };
  }

  // Handle network errors
  if (isNetworkError(error)) {
    return {
      type: "network",
      message: "Connection issue. Please check your internet connection and try again.",
      originalError: error instanceof Error ? error : new Error(String(error)),
      canRetry: true,
    };
  }

  // Handle generic errors
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check for server errors
  if (errorMessage.toLowerCase().includes("server")) {
    return {
      type: "server",
      message: "Server error occurred. Please try again in a moment.",
      originalError: error instanceof Error ? error : new Error(errorMessage),
      canRetry: true,
    };
  }

  // Default unknown error
  return {
    type: "unknown",
    message: context
      ? `Something went wrong while ${context}. Please try again.`
      : "Something went wrong. Please try again.",
    originalError: error instanceof Error ? error : new Error(errorMessage),
    canRetry: true,
  };
}

/**
 * Gets a user-friendly error message for specific contexts
 */
export function getContextualErrorMessage(error: unknown, context: string): string {
  const processed = processError(error, context);

  const contextMessages: Record<string, string> = {
    "loading members": "Failed to load members directory",
    "loading member profile": "Failed to load member profile",
    "loading member posts": "Failed to load member posts",
    "loading member activity": "Failed to load member activity",
    "searching members": "Search failed",
    "updating member": "Failed to update member profile",
  };

  const contextMessage = contextMessages[context.toLowerCase()];
  if (contextMessage && processed.type !== "application") {
    return `${contextMessage}. ${processed.message}`;
  }

  return processed.message;
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
} 