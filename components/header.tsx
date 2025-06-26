"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { SignUpButton, UserButton, SignInButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { MembershipCTAModal } from "@/components/membership-cta-modal";

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-black">
              VAI
            </Link>
            <nav className="hidden md:flex space-x-6"></nav>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="search VAI"
                className="pl-10 border-gray-300 focus:border-green-700 focus:ring-green-700"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/members"
              className="text-gray-600 hover:text-green-700 transition-colors"
            >
              members
            </Link>
            <Link
              href="/settings"
              className="text-gray-600 hover:text-green-700 transition-colors"
            >
              settings
            </Link>
            <Authenticated>
              <Link href="/create">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 hover:border-green-700"
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
                  className="border-gray-300 hover:border-green-700"
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
