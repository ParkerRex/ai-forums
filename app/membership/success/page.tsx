import { Suspense } from "react";
import { SuccessPageClient } from "./page-client";

export const metadata = {
  title: "Welcome to VAI Pro! - VAI",
  description: "Thank you for joining VAI Pro. You now have access to all premium content.",
};

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-muted rounded w-48 mx-auto mb-4" />
          <div className="h-4 bg-muted rounded w-64 mx-auto" />
        </div>
      </div>
    }>
      <SuccessPageClient />
    </Suspense>
  );
}