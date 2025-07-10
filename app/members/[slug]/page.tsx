import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import MemberDetailPageClient from "./page-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MemberDetailPage({ params }: PageProps) {
  // Check if user is authenticated
  const { userId } = await auth();
  
  if (!userId) {
    // Preserve the slug in the redirect URL
    const { slug } = await params;
    redirect(`/sign-in?redirect_url=/members/${slug}`);
  }

  // Initialize Convex client for server-side use
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  
  try {
    // Get the current member data
    const member = await convex.query(api.members.getCurrentMember);
    
    // Check if member exists and has paid access
    if (!member || member.tier === "free" || member.subscriptionStatus !== "active") {
      redirect("/pricing");
    }
  } catch (error) {
    // If there's an error getting member data, redirect to pricing
    console.error("Error fetching member data:", error);
    redirect("/pricing");
  }

  // If all checks pass, render the client component
  return <MemberDetailPageClient params={params} />;
}