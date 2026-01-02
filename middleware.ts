import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/server", "/account", "/settings"];

// Routes that are always public
const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/blog",
  "/api/auth",
  "/forgot-password",
  "/reset-password",
];

// Routes that should bypass all middleware
const bypassRoutes = ["/api/health"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass middleware for specific routes
  if (bypassRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get("vai_session")?.value;

  // Public routes - always accessible
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Protected routes require authentication
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!sessionToken) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Validate session against the API to avoid accepting forged cookies
    try {
      const authResponse = await fetch(new URL("/api/auth/me", request.url), {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
        cache: "no-store",
      });

      if (!authResponse.ok) {
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(signInUrl);
      }
    } catch {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
