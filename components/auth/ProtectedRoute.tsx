"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader2, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

export function ProtectedRoute({
  children,
  requireEmailVerification = false
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useAuth();
  const resendVerification = useMutation(api.auth.resendVerification);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/auth/sign-in?returnUrl=${returnUrl}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - will redirect
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // Check email verification if required
  if (requireEmailVerification && !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="max-w-md w-full">
          <EmailVerificationBanner user={user} resendVerification={resendVerification} />
          <div className="mt-8 p-4 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground text-center">
              You can continue using the app, but some features may be limited until you verify your email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show email verification banner if not verified (but still render children)
  if (!user.emailVerified) {
    return (
      <>
        <EmailVerificationBanner user={user} resendVerification={resendVerification} />
        {children}
      </>
    );
  }

  // Authenticated and verified
  return <>{children}</>;
}

// Email verification banner component
function EmailVerificationBanner({
  user,
  resendVerification
}: {
  user: { email: string };
  resendVerification: any;
}) {
  const handleResend = async () => {
    try {
      await resendVerification({ email: user.email });
      toast.success("Verification email sent! Check your inbox.");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to resend verification email";

      if (errorMessage.includes("rate limit") || errorMessage.includes("too many")) {
        toast.error("Too many requests. Please wait a few minutes before trying again.");
      } else if (errorMessage.includes("already verified")) {
        toast.success("Your email is already verified!");
        // Refresh the page to update auth state
        window.location.reload();
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Email Verification Required
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Please check your inbox and verify your email address to access all features.
              </p>
            </div>
          </div>
          <Button
            onClick={handleResend}
            variant="outline"
            size="sm"
            className="bg-white dark:bg-gray-900 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
          >
            <Mail className="h-4 w-4 mr-2" />
            Resend Email
          </Button>
        </div>
      </div>
    </div>
  );
}
