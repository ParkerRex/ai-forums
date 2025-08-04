import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/(.*)'])

// for basics: https://clerk.com/docs/references/nextjs/clerk-middleware#protect-all-routes
//
// then theres the article about rbac which you can find looking thru the /admin routes

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    await auth.protect()
  }
  // Protect all routes starting with `/admin`
// if (isAdminRoute(req) && (await auth()).sessionClaims?.metadata?.role !== 'admin') {
//  const url = newUrl('/', req.url)
//    return NextResponse.redirect(url)
 // }
})


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
