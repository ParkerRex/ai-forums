import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import MembersPageClient from "./page-client";

export default async function MembersPage() {
  // Check if user is authenticated
  const { userId } = await auth();
  
  if (!userId) {
    redirect(`/sign-in?redirect_url=/members`);
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
  return <MembersPageClient />;
}