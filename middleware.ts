import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Feature flag: Use custom auth instead of Clerk
const USE_CUSTOM_AUTH = process.env.NEXT_PUBLIC_USE_CUSTOM_AUTH === "true";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/server",
  "/account(.*)",
  "/settings(.*)",
  "/admin(.*)",
]);

// Routes that are always public (no auth required)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth(.*)",
  "/pricing",
  "/about",
  "/membership/success",
  "/blog(.*)",
  "/api/auth/session",
]);

// Routes that should bypass all middleware (including Clerk)
const isBypassRoute = createRouteMatcher(["/api/stripe/webhook"]);

/**
 * Custom auth middleware using JWT
 */
async function customAuthMiddleware(req: NextRequest) {
  // Bypass middleware entirely for webhook endpoints
  if (isBypassRoute(req)) {
    return NextResponse.next();
  }

  // Public routes don't require auth
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Get session token from cookie
  const sessionToken = req.cookies.get("vai_session")?.value;

  // Protected routes require authentication
  if (isProtectedRoute(req)) {
    if (!sessionToken) {
      // Not authenticated - redirect to sign-in with returnUrl
      const signInUrl = new URL("/auth/sign-in", req.url);
      signInUrl.searchParams.set("returnUrl", req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Verify JWT token
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "fallback-secret-for-development-only"
      );

      const { payload } = await jwtVerify(sessionToken, secret, {
        issuer: "vai-custom-auth",
        audience: "vai-app",
      });

      // Add user info to request headers for downstream use
      const response = NextResponse.next();
      response.headers.set("x-user-id", payload.memberId as string);
      response.headers.set("x-user-email", payload.email as string);

      return response;
    } catch (error) {
      // Invalid or expired token - redirect to sign-in
      console.error("JWT verification failed:", error);
      const signInUrl = new URL("/auth/sign-in", req.url);
      signInUrl.searchParams.set("returnUrl", req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Default: allow request through
  return NextResponse.next();
}

/**
 * Clerk auth middleware (legacy)
 */
const clerkAuthMiddleware = clerkMiddleware(async (auth, req) => {
  // Bypass middleware entirely for webhook endpoints
  if (isBypassRoute(req)) {
    return NextResponse.next();
  }

  // Protected routes require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

/**
 * Main middleware - routes to custom or Clerk based on feature flag
 */
export default USE_CUSTOM_AUTH ? customAuthMiddleware : clerkAuthMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
