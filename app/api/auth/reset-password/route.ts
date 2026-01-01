import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { members } from "@/db/schema";
import {
  consumePasswordResetToken,
  destroyAllSessions,
  hashPassword,
  validatePasswordStrength,
} from "@/lib/auth";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: "Password too weak", details: passwordValidation.errors },
        { status: 400 },
      );
    }

    // Consume token and get member ID
    const memberId = await consumePasswordResetToken(token);

    if (!memberId) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update member password
    await db
      .update(members)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(members.id, memberId));

    // Invalidate all existing sessions for security
    await destroyAllSessions(memberId);

    return NextResponse.json({
      success: true,
      message: "Password has been reset. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
