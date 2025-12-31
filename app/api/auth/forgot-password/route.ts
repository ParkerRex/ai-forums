import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPasswordResetToken } from "@/lib/auth";

const forgotPasswordSchema = z.object({
	email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsed = forgotPasswordSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.issues },
				{ status: 400 },
			);
		}

		const { email } = parsed.data;

		// Create reset token (returns null if email doesn't exist, but we don't reveal that)
		const token = await createPasswordResetToken(email);

		if (token) {
			// TODO: Send email with reset link
			// For now, just log it in development
			if (process.env.NODE_ENV === "development") {
				console.log(`Password reset token for ${email}: ${token}`);
				console.log(
					`Reset link: ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`,
				);
			}
		}

		// Always return success to prevent email enumeration
		return NextResponse.json({
			success: true,
			message: "If an account exists with this email, a reset link has been sent",
		});
	} catch (error) {
		console.error("Forgot password error:", error);
		return NextResponse.json(
			{ error: "Failed to process request" },
			{ status: 500 },
		);
	}
}
