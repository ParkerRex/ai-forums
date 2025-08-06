/**
 * Error utility functions for handling and processing errors
 */

export interface ErrorInfo {
	type: "network" | "server" | "validation" | "auth" | "generic";
	message: string;
	canRetry: boolean;
	details?: string;
}

/**
 * Process an error and return structured error information
 */
export function processError(error: unknown, context?: string): ErrorInfo {
	const errorMessage = error instanceof Error ? error.message : String(error);
	const errorName = error instanceof Error ? error.name : "";

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

	// Auth errors
	if (
		errorMessage.includes("unauthorized") ||
		errorMessage.includes("forbidden") ||
		errorMessage.includes("401") ||
		errorMessage.includes("403") ||
		errorName === "AuthError"
	) {
		return {
			type: "auth",
			message: "You don't have permission to perform this action.",
			canRetry: false,
			details: context ? `Context: ${context}` : undefined,
		};
	}

	// Generic errors
	return {
		type: "generic",
		message: errorMessage || "An unexpected error occurred. Please try again.",
		canRetry: true,
		details: context ? `Context: ${context}` : undefined,
	};
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries = 3,
	initialDelay = 1000,
): Promise<T> {
	let lastError: unknown;

	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry on the last attempt
			if (i === maxRetries - 1) {
				throw error;
			}

			// Calculate delay with exponential backoff
			const delay = initialDelay * 2 ** i;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}
