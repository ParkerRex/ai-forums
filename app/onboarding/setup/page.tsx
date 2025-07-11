import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OnboardingSetupClient } from "./page-client";

export const metadata = {
  title: "Complete Your Account Setup - VAI",
  description: "Set up your password or connect a social account to access premium content.",
};

export default async function OnboardingSetupPage() {
  const { userId } = await auth();
  
  // If not authenticated, redirect to sign-in
  if (!userId) {
    redirect("/sign-in");
  }

  return <OnboardingSetupClient />;
}