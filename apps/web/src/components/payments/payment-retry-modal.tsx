"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Id } from "@/web/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { CreditCard, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { getPaymentError } from "@/lib/payment-error-utils";
import { toast } from "sonner";

interface PaymentRetryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  failedPayment?: {
    memberId: Id<"members">;
    amount: number;
    currency: string;
    lastError?: unknown;
    invoiceId?: string;
    subscriptionId?: string;
  };
  onSuccess?: () => void;
}

export function PaymentRetryModal({
  open,
  onOpenChange,
  failedPayment,
  onSuccess,
}: PaymentRetryModalProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [showUpdateMethod, setShowUpdateMethod] = useState(false);
  const [retrySuccess, setRetrySuccess] = useState(false);

  const retryPayment = useAction(
    api.stripe.retryFailedPayment.retryFailedPayment,
  );

  if (!failedPayment) return null;

  const paymentError = failedPayment.lastError
    ? getPaymentError(failedPayment.lastError)
    : null;

  const handleRetryPayment = async () => {
    setIsRetrying(true);
    try {
      // Try to retry the existing payment first
      if (failedPayment.invoiceId && retryPayment) {
        const result = await retryPayment({
          invoiceId: failedPayment.invoiceId,
        });

        if (result.success) {
          setRetrySuccess(true);
          toast.success("Payment successful! Your access has been restored.");
          setTimeout(() => {
            onOpenChange(false);
            onSuccess?.();
          }, 2000);
          return;
        }
      }

      // If retry fails or not available, suggest updating payment method
      setShowUpdateMethod(true);
    } catch (error) {
      console.error("Payment retry failed:", error);
      toast.error("Retry failed. Please update your payment method.");
      setShowUpdateMethod(true);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    setIsRetrying(true);
    try {
      // For now, redirect to billing page to update payment method
      // TODO: Implement proper payment method update flow
      router.push("/settings/billing");
    } catch (error) {
      console.error("Failed to redirect to billing:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (retrySuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Payment successful!
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="mb-2 text-lg">Your payment went through!</p>
            <p className="text-muted-foreground">
              Your Pro access has been restored.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Payment needs attention
          </DialogTitle>
          <DialogDescription>
            Your {formatAmount(failedPayment.amount, failedPayment.currency)}{" "}
            payment couldn&apos;t be processed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {paymentError && (
            <Alert>
              <AlertDescription>
                <strong>What happened:</strong> {paymentError.message}
              </AlertDescription>
            </Alert>
          )}

          {!showUpdateMethod ? (
            <>
              <p className="text-muted-foreground text-sm">
                We can try processing your payment again with your current card,
                or you can update your payment method.
              </p>

              <div className="space-y-2">
                <div className="rounded-none border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Retry with current card</p>
                      <p className="text-muted-foreground text-sm">
                        Quick and easy if it was a temporary issue
                      </p>
                    </div>
                    <CreditCard className="text-muted-foreground h-5 w-5" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The retry wasn&apos;t successful. Please update your payment
                  method to continue your subscription.
                </AlertDescription>
              </Alert>

              <p className="text-muted-foreground text-sm">
                You&apos;ll be redirected to securely update your card
                information. Your subscription will resume once updated.
              </p>
            </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {!showUpdateMethod ? (
            <>
              <Button
                onClick={handleRetryPayment}
                disabled={isRetrying}
                className="w-full"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Retrying payment...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry payment
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowUpdateMethod(true)}
                disabled={isRetrying}
                className="w-full"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Update payment method
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleUpdatePaymentMethod}
                disabled={isRetrying}
                className="w-full"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Update payment method
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isRetrying}
                className="w-full"
              >
                I&apos;ll do this later
              </Button>
            </>
          )}

          <p className="text-muted-foreground mt-2 text-center text-xs">
            Your access will be restored immediately after successful payment
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
