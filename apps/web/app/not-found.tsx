"use client";

import Link from "next/link";
import { Button } from "@/web/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const triggerGlobalSearch = () => {
    // Dispatch a custom event to trigger the global search
    const event = new CustomEvent("trigger-global-search");
    window.dispatchEvent(event);
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="max-w-md space-y-6 text-center">
        <h1 className="text-primary text-6xl font-bold">404</h1>

        <div className="space-y-2">
          <h2 className="text-foreground text-2xl font-semibold">
            Page Not Found
          </h2>
          <p className="text-muted-foreground">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It
            may have been moved, deleted, or the URL might be incorrect.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button>
            <Link className="flex items-center" href="/">
              <Home className="mr-2 h-4 w-4" />
              <p>Go Home</p>
            </Link>
          </Button>

          <Button variant="outline" onClick={triggerGlobalSearch}>
            <Search className="mr-2 h-4 w-4" />
            Search Posts
          </Button>
        </div>

        <div className="pt-4">
          <button
            onClick={() => window.history.back()}
            className="hover:bg-accent dark:hover:bg-accent/50 text-muted-foreground hover:text-foreground inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-muted-foreground text-sm">
          If you believe this is an error, please{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact us
          </Link>
        </p>
      </div>
    </div>
  );
}
