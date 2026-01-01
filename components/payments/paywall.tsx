"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface PaywallProps {
  title?: string;
  description?: string;
  preview?: string;
  /** @deprecated Use `preview` instead */
  previewContent?: string;
  tier?: string;
}

/**
 * Paywall component that displays when content is restricted to paying members.
 * Shows a preview of the content and prompts users to subscribe.
 */
export function Paywall({
  title = "Premium Content",
  description,
  preview,
  previewContent,
  tier,
}: PaywallProps) {
  const previewText = preview || previewContent;
  const tierText = tier
    ? `This content requires a ${tier} membership.`
    : "This content is available exclusively to paying members.";
  const descriptionText = description || tierText;

  return (
    <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{descriptionText}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {previewText && (
          <div className="relative overflow-hidden">
            <div className="line-clamp-3 text-sm text-muted-foreground">{previewText}</div>
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}
        <div className="flex justify-center">
          <Button asChild>
            <Link href="/pricing">Become a Member</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
