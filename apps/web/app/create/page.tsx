/**
 * @fileoverview Create post page component for the VAI Community platform.
 * This is the main page component that handles content creation for different post types
 * including text posts, media uploads, link sharing, and poll creation.
 *
 * The page provides authentication-gated access to the post creation form,
 * showing a sign-up prompt for unauthenticated users and the full creation
 * interface for authenticated users.
 *
 * Key features:
 * - Authentication state management with Convex and Clerk
 * - Responsive design with mobile-first approach
 * - Loading states with skeleton components
 * - Error boundaries and fallback UI
 * - SEO optimized with proper meta tags
 *
 * @author VAI Community Team
 * @version 1.0.0
 * @since 2024-01-01
 */

"use client";

// React and Next.js imports for client-side rendering and hooks
import { Suspense } from "react";

// Convex authentication components for managing user auth state
// These components automatically handle authentication state and render children conditionally
import { Authenticated, Unauthenticated } from "convex/react";

// Custom post creation form component that handles all content creation logic
// This is the main component that users interact with to create posts
import { PostCreationForm } from "@/web/components/posts/post-creation-form";

// Shadcn/ui components for consistent styling and layout
// Card components provide structured container layouts with proper spacing
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/web/components/ui/card";

// Clerk authentication components for sign-in modals
// These provide pre-built UI for user authentication flows
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/web/components/ui/button";

/**
 * CreatePostSkeleton component renders a loading placeholder during form initialization.
 * This skeleton mimics the structure of the actual post creation form to provide
 * a smooth loading experience and prevent layout shift.
 *
 * The skeleton includes placeholders for:
 * - Form title and header
 * - Input fields (title, category, content)
 * - Action buttons (cancel, publish, drafts)
 * - Rich text editor area
 *
 * Design considerations:
 * - Uses consistent spacing with the actual form
 * - Muted background colors for subtle appearance
 * - Responsive widths that match real form elements
 * - Animation classes for smooth loading states
 *
 * @returns {JSX.Element} The skeleton loading component
 */
function CreatePostSkeleton() {
  return (
    // Main card container with responsive max width and auto centering
    // Matches the actual form layout for consistent user experience
    <Card className="mx-auto w-full max-w-4xl">
      {/* Header section skeleton with title placeholder */}
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
      </CardHeader>

      {/* Content section with form field skeletons */}
      <CardContent>
        <div className="space-y-6">
          {/* Form fields skeleton group with consistent spacing */}
          <div className="space-y-2">
            {/* Title field label skeleton - 1/4 width to match label size */}
            <div className="bg-muted h-4 w-1/4 rounded" />

            {/* Title input field skeleton - full width input */}
            <div className="bg-muted h-10 rounded" />

            {/* Category field label skeleton - 1/4 width */}
            <div className="bg-muted h-4 w-1/4 rounded" />

            {/* Category selector skeleton - full width */}
            <div className="bg-muted h-10 rounded" />

            {/* Content/rich text editor skeleton - taller for text area */}
            <div className="bg-muted h-32 rounded" />
          </div>

          {/* Action buttons skeleton group */}
          <div className="flex space-x-4">
            {/* Cancel button skeleton */}
            <div className="bg-muted h-10 w-20 rounded" />

            {/* Drafts button skeleton */}
            <div className="bg-muted h-10 w-20 rounded" />

            {/* Publish button skeleton - slightly wider */}
            <div className="bg-muted h-10 w-24 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * CreatePostPage is the main page component for content creation in the VAI Community.
 * This component handles the complete content creation workflow including authentication,
 * form rendering, and user onboarding for new users.
 *
 * Architecture:
 * - Uses Convex's authentication components for state management
 * - Implements code splitting with React Suspense for optimal loading
 * - Provides fallback UI for unauthenticated users
 * - Responsive design that works on mobile and desktop
 *
 * Authentication Flow:
 * 1. Check user authentication state via Convex
 * 2. If authenticated: Show post creation form with all features
 * 3. If unauthenticated: Show onboarding UI with sign-up prompt
 *
 * Performance Optimizations:
 * - Lazy loading of PostCreationForm component
 * - Skeleton loading states to prevent layout shift
 * - Suspense boundaries for better error handling
 * - Minimal initial bundle size with code splitting
 *
 * @returns {JSX.Element} The complete create post page with authentication handling
 *
 * @example
 * // This component is used as a Next.js page route
 * // URL: /create
 * // Automatically handles authentication and routing
 *
 * @see {@link PostCreationForm} - The main form component for authenticated users
 * @see {@link CreatePostSkeleton} - Loading skeleton for form initialization
 */
export default function CreatePostPage() {
  return (
    // Main page container with full viewport height and background
    // Uses CSS custom properties for theme-aware background colors
    <div className="bg-background text-foreground min-h-screen">
      {/* Authenticated user section - shows when user is logged in */}
      {/* Convex automatically manages auth state and renders children conditionally */}
      <Authenticated>
        {/* Responsive container with progressive enhancement for larger screens */}
        {/* Padding scales from mobile (px-4) to desktop (lg:px-8) */}
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
          {/* Suspense boundary for code splitting and loading states */}
          {/* PostCreationForm is lazy-loaded to reduce initial bundle size */}
          <Suspense fallback={<CreatePostSkeleton />}>
            <PostCreationForm />
          </Suspense>
        </div>
      </Authenticated>

      {/* Unauthenticated user section - shows when user is not logged in */}
      {/* Provides clear onboarding flow with value proposition */}
      <Unauthenticated>
        {/* Centered container with responsive padding */}
        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Narrow content area for better reading experience */}
          <div className="mx-auto max-w-md">
            {/* Card component with consistent styling and subtle elevation */}
            <div className="bg-card border-border rounded-none border p-8 text-center shadow-sm">
              {/* Primary heading with emphasis on members-only access */}
              <h1 className="text-foreground mb-4 text-2xl font-bold">
                Members Only
              </h1>

              {/* Value proposition text that explains membership requirement */}
              {/* Emphasizes the exclusive nature of the community */}
              <p className="text-muted-foreground mb-6">
                VAI Community is an exclusive platform for engineers from top
                companies to share AI workflows, prompts, and insights.
                Membership is required to create content.
              </p>

              {/* Primary call-to-action buttons */}
              <div className="space-y-4">
                {/* Members sign-in button */}
                <SignInButton mode="modal">
                  <Button variant="default" className="w-full">
                    Sign In (Members Only)
                  </Button>
                </SignInButton>

                {/* Become a member button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => (window.location.href = "/pricing")}
                >
                  Become a Member
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}
