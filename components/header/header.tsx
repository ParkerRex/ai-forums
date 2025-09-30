"use client";
import { Authenticated, Unauthenticated } from "convex/react";
import { Bookmark, BookOpen, Newspaper } from "lucide-react";
import Link from "next/link";
import React from "react";
import { AuthButton } from "@/components/auth/auth-button";
import { HeaderIconLink } from "@/components/header/header-icon-link";
import { HeaderLogo } from "@/components/header/header-logo";
import { HeaderProvider } from "@/components/header/header-provider";
import { MemberDropdown } from "@/components/header/member-dropdown";
import { NotificationDropdown } from "@/components/header/notification-dropdown";
import { CalendarDaysIcon, type CalendarDaysIconHandle } from "@/components/icons/calendar-days";
import { SearchIcon, type SearchIconHandle } from "@/components/icons/search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UsersIcon, type UsersIconHandle } from "@/components/ui/users";
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
      <header className="bg-background/95 sticky top-0 z-50 border-b backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-8">
              <HeaderLogo />
              <nav className="hidden space-x-6 md:flex"></nav>
            </div>

            <div className="mx-8 max-w-md flex-1">
              <div
                className="relative"
                onMouseEnter={() => searchIconRef.current?.startAnimation()}
                onMouseLeave={() => searchIconRef.current?.stopAnimation()}
              >
                <SearchIcon
                  ref={searchIconRef}
                  className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 transform"
                  size={16}
                />
                <Input
                  placeholder="/ to search"
                  className="cursor-pointer border-black pl-10 dark:border-white"
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
              <HeaderIconLink href="/blog" tooltip="blog">
                <Newspaper size={18} />
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
                  variant="cta"
                  size="default"
                  className="h-[24px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                  onClick={() => (window.location.href = "/pricing")}
                >
                  Join VAI
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
