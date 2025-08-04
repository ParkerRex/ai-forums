import { Resend } from "@convex-dev/resend";
import { render } from "@react-email/components";
import React from "react";

import VerifyEmail from "@vai/emails/src/components/verifyEmail";
import VerifyOTP from "@vai/emails/src/components/verifyOTP";
import MagicLinkEmail from "@vai/emails/src/components/magicLink";
import ResetPasswordEmail from "@vai/emails/src/components/resetPassword";

import { components } from "../convex/_generated/api";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
});

export const sendEmailVerification = async (
  ctx: RunMutationCtx,
  { to, url }: { to: string; url: string }
) => {
  await resend.sendEmail(ctx, {
    from: "Test <onboarding@boboddy.business>",
    to,
    subject: "Verify your email address",
    html: await render(<VerifyEmail url={url} />),
  });
};

export const sendOTPVerification = async (
  ctx: RunMutationCtx,
  { to, code }: { to: string; code: string }
) => {
  await resend.sendEmail(ctx, {
    from: "Test <onboarding@boboddy.business>",
    to,
    subject: "Verify your email address",
    html: await render(<VerifyOTP code={code} />),
  });
};

export const sendMagicLink = async (
  ctx: RunMutationCtx,
  { to, url }: { to: string; url: string }
) => {
  await resend.sendEmail(ctx, {
    from: "Test <onboarding@boboddy.business>",
    to,
    subject: "Sign in to your account",
    html: await render(<MagicLinkEmail url={url} />),
  });
};

export const sendResetPassword = async (
  ctx: RunMutationCtx,
  { to, url }: { to: string; url: string }
) => {
  await resend.sendEmail(ctx, {
    from: "Test <onboarding@boboddy.business>",
    to,
    subject: "Reset your password",
    html: await render(<ResetPasswordEmail url={url} />),
  });
};
