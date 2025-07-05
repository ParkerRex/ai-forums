"use client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, BookOpen } from "lucide-react";
import { UsersIcon, UsersIconHandle } from "@/components/ui/users";
import {
  CalendarDaysIcon,
  CalendarDaysIconHandle,
} from "@/components/ui/calendar-days";
import { UserButton, SignUpButton } from "@clerk/nextjs";
import { AuthButton } from "@/components/auth-button";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { Authenticated, Unauthenticated } from "convex/react";
import React from "react";
import { SearchIcon, SearchIconHandle } from "@/components/ui/search";
import { PlusIcon, PlusIconHandle } from "@/components/ui/plus";

export default function Header() {
  const iconRef = React.useRef<UsersIconHandle>(null);
  const calendarIconRef = React.useRef<CalendarDaysIconHandle>(null);
  const searchIconRef = React.useRef<SearchIconHandle>(null);
  const plusIconRef = React.useRef<PlusIconHandle>(null);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              {/* Light mode logo */}
              <Image
                src="/vai-black.svg"
                alt="VAI logo"
                width={40}
                height={40}
                className="block dark:hidden"
                priority
              />
              {/* Dark mode logo */}
              <Image
                src="/vai-white.svg"
                alt="VAI logo"
                width={40}
                height={40}
                className="hidden dark:block"
                priority
              />
            </Link>
            <nav className="hidden md:flex space-x-6"></nav>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div
              className="relative"
              onMouseEnter={() => searchIconRef.current?.startAnimation()}
              onMouseLeave={() => searchIconRef.current?.stopAnimation()}
            >
              <SearchIcon
                ref={searchIconRef}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input placeholder="type / to search" className="pl-10" />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="px-2 text-muted-foreground hover:text-foreground"
              onMouseEnter={() => calendarIconRef.current?.startAnimation()}
              onMouseLeave={() => calendarIconRef.current?.stopAnimation()}
              asChild
            >
              <Link href="/calendar" className="flex items-center gap-1">
                <CalendarDaysIcon ref={calendarIconRef} size={18} />
                <span>calendar</span>
              </Link>
            </Button>

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
                  variant="default"
                  size="default"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  onMouseEnter={() => plusIconRef.current?.startAnimation()}
                  onMouseLeave={() => plusIconRef.current?.stopAnimation()}
                >
                  <PlusIcon ref={plusIconRef} size={16} className="mr-2" />
                  Create Post
                </Button>
              </Link>
            </Authenticated>
            <Unauthenticated>
              <SignUpButton mode="modal">
                <Button
                  variant="default"
                  size="default"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  onMouseEnter={() => plusIconRef.current?.startAnimation()}
                  onMouseLeave={() => plusIconRef.current?.stopAnimation()}
                >
                  <PlusIcon ref={plusIconRef} size={16} className="mr-2" />
                  Create Post
                </Button>
              </SignUpButton>
            </Unauthenticated>
            <Authenticated>
              <NotificationDropdown />
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
