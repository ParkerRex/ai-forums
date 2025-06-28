"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { SignUpButton, UserButton, SignInButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { MembershipCTAModal } from "@/components/membership-cta-modal";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-foreground">
              VAI
            </Link>
            <nav className="hidden md:flex space-x-6"></nav>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="search VAI"
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/members"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              members
            </Link>
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              settings
            </Link>
            <ThemeToggle />
            <Authenticated>
              <Link href="/create">
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  create
                </Button>
              </Link>
            </Authenticated>
            <Unauthenticated>
              <MembershipCTAModal
                title="Create Your First Post"
                description="Join VAI to share your AI workflows, prompts, and insights with the community"
              >
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  create
                </Button>
              </MembershipCTAModal>
            </Unauthenticated>
            <Authenticated>
              <UserButton />
            </Authenticated>
            <Unauthenticated>
              <SignUpButton />
              <SignInButton />
            </Unauthenticated>
          </div>
        </div>
      </div>
    </header>
  );
}
