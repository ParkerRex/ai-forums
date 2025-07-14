"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, BookOpen } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UsersIcon, UsersIconHandle } from "@/components/ui/users";
import {
  CalendarDaysIcon,
  CalendarDaysIconHandle,
} from "@/components/icons/calendar-days";
import { AuthButton } from "@/components/auth/auth-button";
import { NotificationDropdown } from "@/components/header/notification-dropdown";
import { Authenticated, Unauthenticated } from "convex/react";
import React from "react";
import { SearchIcon, SearchIconHandle } from "@/components/icons/search";
import { MemberDropdown } from "@/components/header/member-dropdown";
import { HeaderProvider } from "@/components/header/header-provider";
import { HeaderIconLink } from "@/components/header/header-icon-link";
import { HeaderLogo } from "@/components/header/header-logo";
// We intentionally do NOT import useSearchHotkey here because we
// only need to *trigger* the global search dialog. The actual
// open/close state is maintained inside the GlobalSearch
// component. To avoid creating a second, isolated state instance,
// we'll fire a custom window event ("trigger-global-search") that
// GlobalSearch is already listening for.

export default function Header() {
  const iconRef = React.useRef<UsersIconHandle>(null);
  const calendarIconRef = React.useRef<CalendarDaysIconHandle>(null);
  const searchIconRef = React.useRef<SearchIconHandle>(null);
  // Trigger helper for the global search. This dispatches the
  // custom event that <GlobalSearch/> listens to, ensuring we
  // modify *its* state rather than a separate local hook state.
  const triggerGlobalSearch = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("trigger-global-search"));
    }
  };

  return (
    <HeaderProvider>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-[60px]">
            <div className="flex items-center space-x-8">
              <HeaderLogo />
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
              <Input
                placeholder="type / to search"
                className="pl-10 cursor-pointer"
                onClick={triggerGlobalSearch}
                onFocus={triggerGlobalSearch}
                readOnly
              />
            </div>
          </div>

            <div className="flex items-center space-x-4">
              <HeaderIconLink
                href="/calendar"
                tooltip="calendar"
                onMouseEnter={() => calendarIconRef.current?.startAnimation()}
                onMouseLeave={() => calendarIconRef.current?.stopAnimation()}
              >
                <CalendarDaysIcon ref={calendarIconRef} size={18} />
              </HeaderIconLink>

              <HeaderIconLink
                href="/members"
                tooltip="members"
                onMouseEnter={() => iconRef.current?.startAnimation()}
                onMouseLeave={() => iconRef.current?.stopAnimation()}
              >
                <UsersIcon ref={iconRef} size={18} />
              </HeaderIconLink>

              <HeaderIconLink href="/educate" tooltip="educate">
                <BookOpen size={18} />
              </HeaderIconLink>
              <Authenticated>
                <HeaderIconLink href="/bookmarks" tooltip="bookmarks">
                  <Bookmark size={18} />
                </HeaderIconLink>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/create">
                      <Button
                        variant="default"
                        size="default"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                      >
                        Create Post
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create post</p>
                  </TooltipContent>
                </Tooltip>
              </Authenticated>
              <Unauthenticated>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => window.location.href = '/pricing'}
                >
                  Become a Member
                </Button>
              </Unauthenticated>
              <Authenticated>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <NotificationDropdown />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>notifications</p>
                  </TooltipContent>
                </Tooltip>
                <MemberDropdown />
              </Authenticated>
              <Unauthenticated>
                <AuthButton />
              </Unauthenticated>
            </div>
          </div>
        </div>
      </header>
    </HeaderProvider>
  );
}
