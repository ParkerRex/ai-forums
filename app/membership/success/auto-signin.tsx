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

export function AutoSignIn({ signInToken, email, sourcePostId }: AutoSignInProps) {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "signing-in" | "error">("loading");
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
            // Sign-in successful, redirect to onboarding with source post if available
            const onboardingUrl = sourcePostId 
              ? `/onboarding/setup?source_post_id=${sourcePostId}`
              : "/onboarding/setup";
            router.push(onboardingUrl);
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
          router.push(`/sign-in/verify-email?email=${encodeURIComponent(email)}`);
        }
      } catch (err) {
        console.error("Auto sign-in error:", err);
        setStatus("error");
        setError("Unable to sign in automatically. Please sign in manually.");
        
        // Redirect to sign-in page after a delay
        setTimeout(() => {
          router.push(`/sign-in?redirect_url=/onboarding/setup&prefill_email=${encodeURIComponent(email)}`);
        }, 3000);
      }
    };

    performAutoSignIn();
  }, [isLoaded, signIn, signInToken, email, router]);

  if (status === "loading" || status === "signing-in") {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Setting up your account...</h3>
        <p className="text-sm text-muted-foreground">
          Please wait while we create your account and sign you in.
        </p>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="p-8 text-center border-red-200 bg-red-50">
        <h3 className="text-lg font-semibold mb-2 text-red-800">Sign-in Issue</h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <p className="text-sm text-muted-foreground">
          Redirecting to sign-in page...
        </p>
      </Card>
    );
  }

  return null;
}