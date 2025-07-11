import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/server",
  "/account(.*)",
  "/settings(.*)",
]);

// Routes that are always public
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing",
  "/membership/success",
  "/api(.*)",
  "/blog(.*)",
]);

// Onboarding routes
const isOnboardingRoute = createRouteMatcher([
  "/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const authResult = await auth();
  const { userId } = authResult;

  // Protected routes require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // If user is authenticated, check onboarding status
  if (userId && !isPublicRoute(req) && !isOnboardingRoute(req)) {
    // Check onboarding status from Clerk metadata
    const publicMetadata = authResult.sessionClaims?.publicMetadata as { onboardingStatus?: string } | undefined;
    
    // If onboarding status is still pending, redirect to setup
    if (publicMetadata?.onboardingStatus === "pending") {
      return NextResponse.redirect(new URL("/onboarding/setup", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};