"use client";

/**
 * Forgot Password Page
 *
 * Request password reset email.
 * Shows success message regardless of email existence (security).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Mail } from "lucide-react";

// Validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const requestResetMutation = useMutation(api.auth.requestPasswordReset);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await requestResetMutation({
        email: values.email.toLowerCase().trim(),
      });

      // Always show success (security - don't leak email existence)
      setSubmittedEmail(values.email);
      setIsSubmitted(true);
      toast.success("Password reset email sent!");
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send reset email";

      if (errorMessage.includes("rate limit")) {
        toast.error("Too many requests. Please try again in an hour.");
        form.setError("email", {
          message: "Rate limit exceeded. Try again later.",
        });
      } else {
        // Still show success for other errors (security)
        setSubmittedEmail(values.email);
        setIsSubmitted(true);
        toast.success("Password reset email sent!");
      }
    }
  }

  // Show success message after submission
  if (isSubmitted) {
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
              We've sent password reset instructions to
            </p>
            <p className="font-medium text-foreground">{submittedEmail}</p>
          </div>

          {/* Instructions */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                If an account exists with this email, you'll receive a password
                reset link shortly.
              </p>

              <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                <li>Check your inbox for an email from us</li>
                <li>Click the reset password link</li>
                <li>Create a new password</li>
              </ol>

              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="font-medium text-foreground">
                    Don't see the email?
                  </strong>{" "}
                  Check your spam folder. The link expires in 1 hour.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => {
                setIsSubmitted(false);
                form.reset();
              }}
              variant="outline"
              className="w-full"
            >
              Try Another Email
            </Button>
            <div className="text-center text-sm">
              <Link
                href="/auth/sign-in"
                className="text-primary underline-offset-4 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show form
  return (
    <div className="container flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Forgot Password?</h1>
          <p className="text-muted-foreground">
            No worries, we'll send you reset instructions
          </p>
        </div>

        {/* Form */}
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

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Email"
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Back to Sign In */}
        <div className="text-center text-sm">
          <Link
            href="/auth/sign-in"
            className="text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
