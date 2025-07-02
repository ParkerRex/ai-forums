"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Bookmark, BookOpen } from "lucide-react";
import { UsersIcon, UsersIconHandle } from "@/components/ui/users";
import { UserButton, SignUpButton } from "@clerk/nextjs";
import { AuthButton } from "@/components/auth-button";
import { Authenticated, Unauthenticated } from "convex/react";
import React from "react";

export default function Header() {
  const iconRef = React.useRef<UsersIconHandle>(null);

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
                placeholder="type / to search"
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="px-2 text-muted-foreground hover:text-foreground"
              onMouseEnter={() => iconRef.current?.startAnimation()}
              onMouseLeave={() => iconRef.current?.stopAnimation()}
              asChild
            >
              <Link href="/members" className="flex items-center gap-1">
                <UsersIcon ref={iconRef} size={18} />
                <span>members</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="px-2 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/educate" className="flex items-center gap-1">
                <BookOpen size={18} />
                <span>educate</span>
              </Link>
            </Button>
            <Authenticated>
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href="/bookmarks" className="flex items-center gap-1">
                  <Bookmark size={18} />
                  <span>bookmarks</span>
                </Link>
              </Button>
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
              <SignUpButton mode="modal">
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  create
                </Button>
              </SignUpButton>
            </Unauthenticated>
            <Authenticated>
              <UserButton />
            </Authenticated>
            <Unauthenticated>
              <AuthButton />
            </Unauthenticated>
          </div>
        </div>
      </div>
    </header>
  );
}
