"use client";

/**
 * Verify Email Sent Page
 *
 * Shown after successful sign-up to inform user to check their email.
 * Includes resend verification option with rate limiting.
 */

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, Loader2, RefreshCw } from "lucide-react";

export default function VerifyEmailSentPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);

  const resendMutation = useMutation(api.auth.resendVerification);

  async function handleResend() {
    if (!email) {
      toast.error("Email address not found. Please try signing up again.");
      return;
    }

    setIsResending(true);

    try {
      await resendMutation({ email: email.toLowerCase().trim() });

      toast.success("Verification email sent! Check your inbox.");

      // Disable resend button temporarily
      setCanResend(false);
      setTimeout(() => setCanResend(true), 60000); // 1 minute cooldown
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to resend email";

      if (errorMessage.includes("rate limit")) {
        toast.error("Too many requests. Please try again later.");
        setCanResend(false);
        setTimeout(() => setCanResend(true), 60000); // 1 minute cooldown
      } else if (errorMessage.includes("already verified")) {
        toast.error("This email is already verified. Try signing in.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="container flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Check Your Email</h1>
          <p className="text-muted-foreground">
            We've sent a verification link to
          </p>
          {email && (
            <p className="font-medium text-foreground">{email}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              To complete your registration and access your account:
            </p>

            <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
              <li>Check your inbox for an email from us</li>
              <li>Click the verification link in the email</li>
              <li>You'll be automatically signed in</li>
            </ol>

            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="font-medium text-foreground">
                  Don't see the email?
                </strong>{" "}
                Check your spam or junk folder. The email should arrive within a
                few minutes.
              </p>
            </div>
          </div>
        </div>

        {/* Resend Button */}
        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={isResending || !canResend}
            variant="outline"
            className="w-full"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </Button>

          {!canResend && !isResending && (
            <p className="text-center text-xs text-muted-foreground">
              Please wait 1 minute before requesting another email
            </p>
          )}
        </div>

        {/* Help Text */}
        <div className="rounded-md bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <a
              href="mailto:support@example.com"
              className="text-primary underline-offset-4 hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
