/**
 * @fileoverview Auto-sign-in helper used by the checkout success page.
 *
 * When a guest finishes a Stripe checkout the webhook stores a one-time
 * Clerk `signInToken` on their new Convex member record.  This component
 * consumes that token, performs the Clerk ticket sign-in flow on the
 * client, then redirects the user to the desired page.
 *
 * Existing members (who won’t have a token) bypass this component.
 *
 * NOTE: Once the success flow is migrated to an Edge route this component
 * can be removed entirely.
 */
"use client";

import { useEffect, useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface AutoSignInProps {
  signInToken?: string;
  email: string;
  sourcePostId?: string;
}

export function AutoSignIn({
  signInToken,
  email,
  sourcePostId,
}: AutoSignInProps) {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "signing-in" | "error">(
    "loading",
  );
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const performAutoSignIn = async () => {
      if (!isLoaded || !signIn) return;

      try {
        setStatus("signing-in");

        if (signInToken) {
          // Use the sign-in token for passwordless authentication
          const signInResult = await signIn.create({
            strategy: "ticket",
            ticket: signInToken,
          });

          if (signInResult.status === "complete") {
            // Sign-in successful, redirect to source post or home
            if (sourcePostId) {
              // TODO: Get the actual post URL from the post ID
              router.push("/");
            } else {
              router.push("/");
            }
          } else {
            throw new Error("Sign-in not complete");
          }
        } else {
          // No token available, create email link sign-in
          await signIn.create({
            strategy: "email_link",
            identifier: email,
          });

          // This will send an email, but we want immediate access
          // So we'll redirect to a page explaining the email was sent
          router.push(
            `/sign-in/verify-email?email=${encodeURIComponent(email)}`,
          );
        }
      } catch (err) {
        console.error("Auto sign-in error:", err);
        setStatus("error");
        setError("Unable to sign in automatically. Please sign in manually.");

        // Redirect to sign-in page after a delay
        setTimeout(() => {
          const redirectUrl = sourcePostId
            ? `/?source_post_id=${sourcePostId}`
            : "/";
          router.push(
            `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}&prefill_email=${encodeURIComponent(email)}`,
          );
        }, 3000);
      }
    };

    performAutoSignIn();
  }, [isLoaded, signIn, signInToken, email, router, sourcePostId]);

  if (status === "loading" || status === "signing-in") {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
        <h3 className="mb-2 text-lg font-semibold">
          Setting up your account...
        </h3>
        <p className="text-muted-foreground text-sm">
          Please wait while we create your account and sign you in.
        </p>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="border-red-200 bg-red-50 p-8 text-center">
        <h3 className="mb-2 text-lg font-semibold text-red-800">
          Sign-in Issue
        </h3>
        <p className="mb-4 text-sm text-red-600">{error}</p>
        <p className="text-muted-foreground text-sm">
          Redirecting to sign-in page...
        </p>
      </Card>
    );
  }

  return null;
}
