"use client";

/**
 * Verify Email Page
 *
 * Handles email verification via token from URL.
 * Automatically verifies on page load and signs user in on success.
 */

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

type VerificationState = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerificationState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(3);

  const verifyMutation = useMutation(api.auth.verifyEmail);

  // Verify email on mount
  useEffect(() => {
    async function verify() {
      if (!token) {
        setState("error");
        setErrorMessage("Verification token is missing. Please check your email link.");
        return;
      }

      try {
        const result = await verifyMutation({ token });

        // Set session cookie via API route
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: result.sessionToken }),
        });

        setState("success");
        toast.success("Email verified! Signing you in...");

        // Redirect to home after countdown
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              router.push("/");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (error: any) {
        setState("error");
        const errorMsg = error?.message || "Failed to verify email";

        if (errorMsg.includes("expired")) {
          setErrorMessage("This verification link has expired. Please request a new one.");
        } else if (errorMsg.includes("invalid")) {
          setErrorMessage("This verification link is invalid. Please check your email or request a new one.");
        } else if (errorMsg.includes("already verified")) {
          setErrorMessage("This email is already verified. You can sign in now.");
        } else {
          setErrorMessage(errorMsg);
        }

        toast.error(errorMsg);
      }
    }

    verify();
  }, [token, verifyMutation, router]);

  return (
    <div className="container flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Loading State */}
        {state === "loading" && (
          <>
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                Verifying Your Email
              </h1>
              <p className="text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </div>
          </>
        )}

        {/* Success State */}
        {state === "success" && (
          <>
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                Email Verified!
              </h1>
              <p className="text-muted-foreground">
                Your email has been successfully verified.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Redirecting you to the home page in{" "}
                  <span className="font-semibold text-foreground">
                    {countdown}
                  </span>{" "}
                  seconds...
                </p>
                <Button
                  onClick={() => router.push("/")}
                  className="mt-4"
                >
                  Go to Home Now
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Error State */}
        {state === "error" && (
          <>
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                Verification Failed
              </h1>
              <p className="text-muted-foreground">
                We couldn't verify your email address.
              </p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
              <p className="text-center text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => router.push("/auth/verify-email-sent")}
                variant="outline"
                className="w-full"
              >
                Request New Verification Email
              </Button>
              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  Already verified?{" "}
                </span>
                <Link
                  href="/auth/sign-in"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
