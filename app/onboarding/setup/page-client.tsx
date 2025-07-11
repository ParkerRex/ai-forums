"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useSignIn } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, AlertCircle, Check, Loader2 } from "lucide-react";
import { FaGoogle, FaDiscord } from "react-icons/fa";
import { Id } from "@/convex/_generated/dataModel";

export function OnboardingSetupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded: userLoaded } = useUser();
  const { signIn } = useSignIn();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Get source post if redirected from a specific post
  const sourcePostId = searchParams.get("source_post_id") as Id<"posts"> | null;

  // Get current member data
  const member = useQuery(api.auth.current);
  const completeOnboarding = useMutation(api.auth.clerkAccounts.completeOnboarding);
  
  // Get post routing if we have a source post
  const postRouting = useQuery(
    api.posts.getPostRouting,
    sourcePostId ? { postId: sourcePostId } : "skip"
  );

  // Check if onboarding is already complete
  if (member?.status === "active") {
    router.push("/");
    return null;
  }

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      
      // Update user password in Clerk
      await user?.updatePassword({ 
        newPassword: password 
      });

      // Mark onboarding as complete
      if (member) {
        await completeOnboarding({
          memberId: member._id,
          authMethod: "password",
        });
      }

      // Redirect to original post or home
      if (postRouting) {
        router.push(`/${postRouting.categoryName}/${postRouting.slug}`);
      } else {
        router.push("/");
      }
    } catch (err) {
      setError((err as Error).message || "Failed to set password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "oauth_google" | "oauth_discord") => {
    try {
      setIsLoading(true);
      
      // Link social account
      const redirectUrl = sourcePostId 
        ? `/onboarding/complete?source_post_id=${sourcePostId}`
        : "/onboarding/complete";
      
      await signIn?.authenticateWithRedirect({
        strategy: provider,
        redirectUrl,
        redirectUrlComplete: "/",
      });
    } catch (err) {
      setError((err as Error).message || `Failed to connect ${provider}`);
      setIsLoading(false);
    }
  };

  if (!userLoaded || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Secure Your Account</h1>
          <p className="text-muted-foreground">
            Choose how you want to sign in to access your premium content
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="p-6">
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">Set Password</TabsTrigger>
              <TabsTrigger value="social">Connect Social</TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="space-y-4 mt-6">
              <form onSubmit={handlePasswordSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p className="text-sm text-muted-foreground">
                    Must be at least 8 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Set Password & Continue
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="social" className="space-y-4 mt-6">
              <p className="text-sm text-muted-foreground text-center mb-4">
                Connect your existing account for easy sign-in
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSocialAuth("oauth_google")}
                disabled={isLoading}
              >
                <FaGoogle className="w-4 h-4 mr-2" />
                Continue with Google
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSocialAuth("oauth_discord")}
                disabled={isLoading}
              >
                <FaDiscord className="w-4 h-4 mr-2" />
                Continue with Discord
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Your social account will be linked to your VAI membership
              </p>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <strong>Note:</strong> You must complete this step to access your premium content
        </p>
      </div>
    </div>
  );
}