"use client";

import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import React from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

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
	className?: string;
}

/**
 * Generic error display component using Alert
 */
export function ErrorDisplay({
	error,
	context,
	onRetry,
	className,
}: ErrorDisplayProps) {
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
					<div className="mb-3 flex items-center text-sm">
						{isOnline ? (
							<>
								<Wifi className="mr-2 h-4 w-4 text-green-600" />
								<span className="text-green-600">Connection restored</span>
							</>
						) : (
							<>
								<WifiOff className="mr-2 h-4 w-4 text-red-600" />
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
export function processError(
	error: Error | string,
	context?: string,
): ErrorInfo {
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
export function InlineErrorDisplay({
	error,
	context,
	onRetry,
}: ErrorDisplayProps) {
	const processedError = processError(error, context);

	return (
		<div className="bg-destructive/10 rounded-md p-4">
			<div className="flex">
				<div className="flex-shrink-0">
					<AlertTriangle className="text-destructive h-5 w-5" />
				</div>
				<div className="ml-3">
					<h3 className="text-destructive text-sm font-medium">
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
								<RefreshCw className="mr-2 h-4 w-4" />
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
export function FullPageErrorDisplay({
	error,
	context,
	onRetry,
}: ErrorDisplayProps) {
	const processedError = processError(error, context);
	const { isOnline } = useNetworkStatus();

	return (
		<div className="bg-background flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-md text-center">
				<div className="mb-6">
					<AlertTriangle className="text-destructive mx-auto mb-4 h-16 w-16" />
					<h1 className="text-foreground mb-2 text-2xl font-bold">
						Something went wrong
					</h1>
					<p className="text-muted-foreground">{processedError.message}</p>
				</div>

				{/* Network status */}
				{processedError.type === "network" && (
					<div className="mb-6 flex items-center justify-center text-sm">
						{isOnline ? (
							<>
								<Wifi className="mr-2 h-4 w-4 text-green-600" />
								<span className="text-green-600">Connection restored</span>
							</>
						) : (
							<>
								<WifiOff className="text-destructive mr-2 h-4 w-4" />
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
							<RefreshCw className="mr-2 h-4 w-4" />
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
		<div
			className={`fixed right-4 top-4 z-50 rounded-md border px-3 py-2 text-sm font-medium ${
				isOnline
					? "border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
					: "bg-destructive/10 text-destructive border-destructive/20"
			}`}
		>
			<div className="flex items-center">
				{isOnline ? (
					<>
						<Wifi className="mr-2 h-4 w-4" />
						Back online
					</>
				) : (
					<>
						<WifiOff className="mr-2 h-4 w-4" />
						You&apos;re offline
					</>
				)}
			</div>
		</div>
	);
}
