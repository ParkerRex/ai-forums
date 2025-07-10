"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function OnboardingCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const member = useQuery(api.auth.current);
  const completeOnboarding = useMutation(api.auth.clerkAccounts.completeOnboarding);
  
  // Get source post if provided
  const sourcePostId = searchParams.get("source_post_id") as Id<"posts"> | null;
  const postRouting = useQuery(
    api.posts.getPostRouting,
    sourcePostId ? { postId: sourcePostId } : "skip"
  );

  useEffect(() => {
    const finishOnboarding = async () => {
      if (!member || member.status === "active") {
        // Already completed or no member found
        router.push("/");
        return;
      }

      if (member.status === "pending_onboarding" && user) {
        try {
          // Determine auth method based on user's linked accounts
          let authMethod: "google" | "discord" = "google";
          
          if (user.externalAccounts.some(acc => acc.provider === "discord")) {
            authMethod = "discord";
          }

          // Complete onboarding
          await completeOnboarding({
            memberId: member._id,
            authMethod,
          });

          // Redirect to original post or home after a brief delay
          setTimeout(() => {
            if (postRouting) {
              router.push(`/${postRouting.categoryName}/${postRouting.slug}`);
            } else {
              router.push("/");
            }
          }, 1500);
        } catch (error) {
          console.error("Error completing onboarding:", error);
          router.push("/onboarding/setup");
        }
      }
    };

    finishOnboarding();
  }, [member, user, completeOnboarding, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="p-8 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Account Setup Complete!</h1>
        <p className="text-muted-foreground mb-6">
          Your social account has been connected successfully.
        </p>
        
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground mt-4">
          Redirecting to premium content...
        </p>
      </Card>
    </div>
  );
}