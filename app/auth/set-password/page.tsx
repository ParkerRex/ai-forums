"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetPasswordForm = z.infer<typeof setPasswordSchema>;

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const resetPassword = useMutation(api.auth.resetPassword);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordSchema),
  });

  const password = watch("password");

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError("Missing migration token. Please contact support for assistance.");
    }
  }, [token]);

  const onSubmit = async (data: SetPasswordForm) => {
    if (!token) {
      toast.error("Missing migration token");
      return;
    }

    setIsSubmitting(true);

    try {
      // Use the same resetPassword mutation (migration tokens are stored in password_resets table)
      const result = await resetPassword({
        token,
        newPassword: data.password,
      });

      // Set session cookie via API route
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: result.sessionToken }),
      });

      toast.success("Password set successfully! Please verify your email address.");

      // Redirect to verify email sent page (email verification should be triggered automatically)
      router.push(`/auth/verify-email-sent?email=${encodeURIComponent(email || "")}`);
    } catch (error: any) {
      console.error("Set password error:", error);

      // Handle specific error types
      const errorMessage = error?.message || error?.toString() || "Failed to set password";

      if (errorMessage.includes("expired") || errorMessage.includes("invalid")) {
        setTokenError("This migration link has expired. Please contact support for a new link.");
        toast.error("Invalid or expired migration link");
      } else if (errorMessage.includes("complexity") || errorMessage.includes("requirements")) {
        toast.error("Password does not meet security requirements");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show token error state
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Invalid Migration Link</CardTitle>
            <CardDescription>{tokenError}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">Need help?</p>
              <p>Please contact our support team at support@vai.com for assistance with account migration.</p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/sign-in">Back to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show set password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Welcome! Set Your Password</CardTitle>
          <CardDescription>
            We've upgraded our authentication system for better security.
            Please set a password for your account to complete the migration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Display (if available) */}
            {email && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Account: </span>
                <span className="font-medium">{email}</span>
              </div>
            )}

            {/* Migration Info Banner */}
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>What's changing?</strong> We're moving to a more secure authentication system.
                Your account data is safe - you just need to set a password to continue.
              </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
                disabled={isSubmitting}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Password Strength Meter */}
            {password && (
              <PasswordStrengthMeter password={password} />
            )}

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                disabled={isSubmitting}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Password...
                </>
              ) : (
                "Set Password & Continue"
              )}
            </Button>

            {/* Help Text */}
            <div className="text-center text-xs text-muted-foreground">
              After setting your password, you'll need to verify your email address.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
