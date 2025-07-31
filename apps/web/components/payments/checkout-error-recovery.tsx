"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  CreditCard,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/web/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/web/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/web/components/ui/alert";
import {
  getPaymentError,
  formatErrorDisplay,
  getRecoverySuggestions,
  isTemporaryError,
  isPaymentMethodError,
} from "@/lib/payment-error-utils";
import { cn } from "@/lib/utils";

interface CheckoutErrorRecoveryProps {
  error: unknown;
  onRetry: () => void;
  onChangePaymentMethod?: () => void;
  onContactSupport?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function CheckoutErrorRecovery({
  error,
  onRetry,
  onChangePaymentMethod,
  onContactSupport,
  isRetrying = false,
  className,
}: CheckoutErrorRecoveryProps) {
  const router = useRouter();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Parse the error
  const paymentError = getPaymentError(error);
  const errorDisplay = formatErrorDisplay(paymentError);
  const suggestions = getRecoverySuggestions(paymentError);

  // Auto-retry for temporary errors
  useEffect(() => {
    if (isTemporaryError(paymentError) && !isRetrying) {
      // Start countdown for auto-retry
      setRetryCountdown(5);
    }
  }, [paymentError, isRetrying]);

  // Countdown timer
  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return;

    const timer = setTimeout(() => {
      if (retryCountdown === 1) {
        onRetry();
        setRetryCountdown(null);
      } else {
        setRetryCountdown(retryCountdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [retryCountdown, onRetry]);

  const getIcon = () => {
    switch (errorDisplay.icon) {
      case "alert":
        return <AlertCircle className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      case "info":
        return <Info className="h-5 w-5" />;
    }
  };

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      // Default: open email with pre-filled error details
      const subject = encodeURIComponent("Payment Error - Need Help");
      const body = encodeURIComponent(
        `Hi VAI Support,\n\nI encountered an error during checkout:\n\nError: ${paymentError.message}\nError Code: ${paymentError.code}\nTime: ${new Date().toISOString()}\n\nCan you help me resolve this?\n\nThanks!`,
      );
      window.location.href = `mailto:support@vai.dev?subject=${subject}&body=${body}`;
    }
  };

  return (
    <Card className={cn("mx-auto max-w-lg", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {getIcon()}
          <span>Payment hiccup</span>
        </CardTitle>
        <CardDescription>
          Don&apos;t worry, this happens sometimes. Let&apos;s get it sorted.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>{errorDisplay.title}</AlertTitle>
          <AlertDescription>{errorDisplay.description}</AlertDescription>
        </Alert>

        {/* Recovery suggestions */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-sm"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            {showSuggestions ? "Hide" : "Show"} other options
          </Button>

          {showSuggestions && (
            <div className="text-muted-foreground mt-2 space-y-1 text-sm">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground/50">•</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {/* Primary action */}
        {isPaymentMethodError(paymentError) && onChangePaymentMethod ? (
          <Button
            className="w-full"
            onClick={onChangePaymentMethod}
            disabled={isRetrying}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Try a different card
          </Button>
        ) : (
          <Button className="w-full" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : retryCountdown ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retrying in {retryCountdown}s...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </>
            )}
          </Button>
        )}

        {/* Secondary actions */}
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Go back
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleContactSupport}
          >
            Get help
          </Button>
        </div>

        {/* Trust message */}
        <p className="text-muted-foreground mt-2 text-center text-xs">
          Your card hasn&apos;t been charged. We&apos;re here to help.
        </p>
      </CardFooter>
    </Card>
  );
}

/**
 * Inline error recovery for checkout forms
 */
interface InlineErrorRecoveryProps {
  error: unknown;
  onDismiss: () => void;
  className?: string;
}

export function InlineErrorRecovery({
  error,
  onDismiss,
  className,
}: InlineErrorRecoveryProps) {
  const paymentError = getPaymentError(error);

  return (
    <Alert variant="destructive" className={cn("mt-4", className)}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Oops!</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>{paymentError.message}</p>
        <p className="text-sm">{paymentError.suggestion}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
          className="mt-2"
        >
          Got it
        </Button>
      </AlertDescription>
    </Alert>
  );
}
