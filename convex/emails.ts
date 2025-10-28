/**
 * @fileoverview Internal Email Actions
 *
 * Handles sending transactional emails for authentication flows.
 * Uses Resend API for email delivery with React Email templates.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";
import { VerifyEmail } from "../emails/VerifyEmail";
import { ResetPassword } from "../emails/ResetPassword";
import { AuthMigration } from "../emails/AuthMigration";
import { PasswordChanged } from "../emails/PasswordChanged";

// Initialize Resend client
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY not set - emails will be logged only");
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Retry wrapper for email sending with exponential backoff
 */
async function sendWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`[Email] Attempt ${attempt}/${maxAttempts} failed:`, error);

      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Email] Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Send email verification action
 *
 * Sends an email with a verification link to confirm user's email address.
 */
export const sendVerificationEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
    firstName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { email, token, firstName }) => {
    // Get app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/auth/verify-email?token=${token}`;

    console.log(`[Email] Sending verification email to ${email}`);
    console.log(`  URL: ${verificationUrl}`);

    const resend = getResendClient();

    if (!resend) {
      console.log("[Email] Resend not configured - logging email only");
      return null;
    }

    try {
      await sendWithRetry(async () => {
        const { data, error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || "VAI <noreply@vai.com>",
          to: email,
          subject: "Verify your VAI account",
          react: VerifyEmail({
            firstName,
            verificationUrl,
          }),
        });

        if (error) {
          throw new Error(`Resend API error: ${JSON.stringify(error)}`);
        }

        console.log(`[Email] Verification email sent successfully: ${data?.id}`);
      });
    } catch (error) {
      console.error("[Email] Failed to send verification email after retries:", error);
      // Don't throw - log the error but don't block sign-up
      // User can request a new verification email
    }

    return null;
  },
});

/**
 * Send password reset email action
 *
 * Sends an email with a password reset link.
 */
export const sendPasswordResetEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
    firstName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { email, token, firstName }) => {
    // Get app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

    console.log(`[Email] Sending password reset email to ${email}`);
    console.log(`  URL: ${resetUrl}`);

    const resend = getResendClient();

    if (!resend) {
      console.log("[Email] Resend not configured - logging email only");
      return null;
    }

    try {
      await sendWithRetry(async () => {
        const { data, error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || "VAI <noreply@vai.com>",
          to: email,
          subject: "Reset your password",
          react: ResetPassword({
            firstName,
            resetUrl,
          }),
        });

        if (error) {
          throw new Error(`Resend API error: ${JSON.stringify(error)}`);
        }

        console.log(`[Email] Password reset email sent successfully: ${data?.id}`);
      });
    } catch (error) {
      console.error("[Email] Failed to send password reset email after retries:", error);
      // Don't throw - log the error
      // User can request another reset email
    }

    return null;
  },
});

/**
 * Send migration email action
 *
 * Sends an email to existing users asking them to set a password
 * as part of migration from Clerk to custom auth.
 */
export const sendMigrationEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
    firstName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { email, token, firstName }) => {
    // Get app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const setPasswordUrl = `${appUrl}/auth/set-password?token=${token}&email=${encodeURIComponent(email)}`;

    console.log(`[Email] Sending migration email to ${email}`);
    console.log(`  URL: ${setPasswordUrl}`);

    const resend = getResendClient();

    if (!resend) {
      console.log("[Email] Resend not configured - logging email only");
      return null;
    }

    try {
      await sendWithRetry(async () => {
        const { data, error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || "VAI <noreply@vai.com>",
          to: email,
          subject: "Action Required: Set Your Password - VAI Authentication Upgrade",
          react: AuthMigration({
            firstName,
            setPasswordUrl,
          }),
        });

        if (error) {
          throw new Error(`Resend API error: ${JSON.stringify(error)}`);
        }

        console.log(`[Email] Migration email sent successfully: ${data?.id}`);
      });
    } catch (error) {
      console.error("[Email] Failed to send migration email after retries:", error);
      // Don't throw - log the error
      // Migration emails can be retried
    }

    return null;
  },
});

/**
 * Send password change notification email action
 *
 * Sends a security notification email when a user's password is changed.
 * This helps users detect unauthorized password changes.
 */
export const sendPasswordChangedEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { email, firstName }) => {
    // Get app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/auth/forgot-password`;

    // Format current time for email display
    const changeTime = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    });

    console.log(`[Email] Sending password changed notification to ${email}`);

    const resend = getResendClient();

    if (!resend) {
      console.log("[Email] Resend not configured - logging email only");
      return null;
    }

    try {
      await sendWithRetry(async () => {
        const { data, error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || "VAI Security <security@vai.com>",
          to: email,
          subject: "Your password was changed - VAI",
          react: PasswordChanged({
            firstName,
            changeTime,
            resetUrl,
          }),
        });

        if (error) {
          throw new Error(`Resend API error: ${JSON.stringify(error)}`);
        }

        console.log(`[Email] Password changed notification sent successfully: ${data?.id}`);
      });
    } catch (error) {
      console.error("[Email] Failed to send password changed notification after retries:", error);
      // Don't throw - log the error but don't block the password reset flow
      // The password has already been changed at this point
    }

    return null;
  },
});
