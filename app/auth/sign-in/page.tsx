"use client";

/**
 * Sign In Page
 *
 * User login page with email/password authentication.
 * Includes error handling for rate limiting, locked accounts, and unverified emails.
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Validation schema
const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  const signInMutation = useMutation(api.auth.signIn);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SignInFormValues) {
    try {
      const result = await signInMutation({
        email: values.email.toLowerCase().trim(),
        password: values.password,
      });

      // Set session cookie via API route
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: result.sessionToken }),
      });

      // Success - redirect to return URL or home
      toast.success("Signed in successfully!");
      router.push(returnUrl);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to sign in";

      // Handle specific error types
      if (errorMessage.includes("rate limit")) {
        toast.error("Too many sign-in attempts. Please try again in 15 minutes.");
        form.setError("email", {
          message: "Rate limit exceeded. Try again later.",
        });
      } else if (errorMessage.includes("locked")) {
        // Extract unlock time if available
        const unlockMatch = errorMessage.match(/until (\d+)/);
        const unlockTime = unlockMatch ? new Date(Number.parseInt(unlockMatch[1])) : null;
        const unlockMessage = unlockTime
          ? `Account locked until ${unlockTime.toLocaleTimeString()}`
          : "Account temporarily locked due to too many failed attempts";

        toast.error(unlockMessage);
        form.setError("password", { message: unlockMessage });
      } else if (errorMessage.includes("not verified")) {
        toast.error("Please verify your email before signing in.", {
          action: {
            label: "Resend Email",
            onClick: () => router.push(`/auth/verify-email-sent?email=${encodeURIComponent(values.email)}`),
          },
        });
        form.setError("email", {
          message: "Email not verified. Check your inbox.",
        });
      } else if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("password") ||
        errorMessage.includes("not found")
      ) {
        toast.error("Invalid email or password");
        form.setError("password", { message: "Invalid email or password" });
      } else {
        toast.error(errorMessage);
      }
    }
  }

  return (
    <div className="container flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        {/* Sign In Form */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        href="/auth/forgot-password"
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Sign Up Link */}
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link
            href="/auth/sign-up"
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </div>

        {/* Return URL Info */}
        {returnUrl !== "/" && (
          <div className="rounded-md bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              You'll be redirected after signing in
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
