import { type NextRequest, NextResponse } from "next/server";
import { getCurrentMember, type SessionMember } from "@/lib/auth";

/**
 * Route context type for Next.js App Router API routes
 */
type RouteContext = { params: Promise<Record<string, string>> };

/**
 * Handler type for authenticated routes
 */
type AuthenticatedHandler = (
  request: NextRequest,
  context: RouteContext,
  member: SessionMember
) => Promise<NextResponse>;

/**
 * Handler type for routes with optional authentication
 */
type OptionalAuthHandler = (
  request: NextRequest,
  context: RouteContext,
  member: SessionMember | null
) => Promise<NextResponse>;

/**
 * Wraps a route handler to require authentication.
 * Returns 401 Unauthorized if no valid session exists.
 *
 * @example
 * ```typescript
 * // app/api/posts/route.ts
 * import { withAuth } from "@/lib/api/middleware";
 *
 * export const POST = withAuth(async (request, context, member) => {
 *   const data = await request.json();
 *   const post = await createPost(data, member.id);
 *   return NextResponse.json(post, { status: 201 });
 * });
 * ```
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: RouteContext) => {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request, context, member);
  };
}

/**
 * Wraps a route handler to require admin access.
 * Returns 401 Unauthorized if no valid session exists.
 * Returns 403 Forbidden if user is not an admin.
 *
 * @example
 * ```typescript
 * // app/api/admin/members/route.ts
 * import { withAdmin } from "@/lib/api/middleware";
 *
 * export const DELETE = withAdmin(async (request, context, member) => {
 *   // Admin-only deletion logic
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withAdmin(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: RouteContext) => {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (member.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
    return handler(request, context, member);
  };
}

/**
 * Wraps a route handler to optionally include authentication.
 * Useful for routes that behave differently for authenticated users
 * (e.g., personalized content, vote status).
 *
 * @example
 * ```typescript
 * // app/api/posts/route.ts
 * import { withOptionalAuth } from "@/lib/api/middleware";
 *
 * export const GET = withOptionalAuth(async (request, context, member) => {
 *   const posts = await fetchPosts();
 *   // member is null for unauthenticated users
 *   if (member) {
 *     // Add personalization for logged-in users
 *   }
 *   return NextResponse.json(posts);
 * });
 * ```
 */
export function withOptionalAuth(handler: OptionalAuthHandler) {
  return async (request: NextRequest, context: RouteContext) => {
    const member = await getCurrentMember();
    return handler(request, context, member);
  };
}

/**
 * Combines multiple middleware wrappers.
 * Applies them in order from right to left (like compose).
 *
 * @example
 * ```typescript
 * // Require admin + rate limiting
 * export const DELETE = compose(
 *   withRateLimit("admin"),
 *   withAdmin
 * )(async (request, context, member) => {
 *   // Handler logic
 * });
 * ```
 */
export function compose<T extends (...args: unknown[]) => unknown>(
  ...middlewares: Array<(handler: T) => T>
) {
  return (handler: T): T => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}
