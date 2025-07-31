"use client";

import React, { Component, ReactNode } from "react";
import { FullPageErrorDisplay, ErrorDisplay } from "./error-display";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: "page" | "inline";
  context?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * React Error Boundary component for catching errors in component trees
 * Recommended by Convex for handling query errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    console.error("Error caught by boundary:", error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Reset error state to retry
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback = "inline", context } = this.props;

      if (fallback === "page") {
        return (
          <FullPageErrorDisplay
            error={this.state.error}
            context={context}
            onRetry={this.handleRetry}
          />
        );
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          context={context}
          onRetry={this.handleRetry}
          className="my-4"
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

export function QueryErrorBoundary({
  children,
  context = "loading data"
}: QueryErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback="inline"
      context={context}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Page-level error boundary for major failures
 */
export function PageErrorBoundary({
  children,
  context = "loading page"
}: { children: ReactNode; context?: string }) {
  return (
    <ErrorBoundary
      fallback="page"
      context={context}
    >
      {children}
    </ErrorBoundary>
  );
} 