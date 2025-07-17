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

// Routes that should bypass all middleware (including Clerk)
const isBypassRoute = createRouteMatcher([
  "/api/stripe/webhook",
]);


export default clerkMiddleware(async (auth, req) => {
  // Bypass middleware entirely for webhook endpoints
  if (isBypassRoute(req)) {
    return NextResponse.next();
  }

  const authResult = await auth();
  const { userId } = authResult;

  // Protected routes require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
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