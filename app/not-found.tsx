"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function NotFound() {
  const triggerGlobalSearch = () => {
    // Dispatch a custom event to trigger the global search
    const event = new CustomEvent('trigger-global-search');
    window.dispatchEvent(event);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Page Not Found
          </h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. 
            It may have been moved, deleted, or the URL might be incorrect.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={triggerGlobalSearch}
          >
            <Search className="w-4 h-4 mr-2" />
            Search Posts
          </Button>
        </div>

        <div className="pt-4">
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-9 px-4 py-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          If you believe this is an error, please{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact us
          </Link>
        </p>
      </div>
    </div>
  );
}