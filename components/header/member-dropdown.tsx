"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, LogOut } from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { ThemeToggleSwitch } from "@/components/theme-toggle-switch";
import { SettingsDialog } from "@/components/settings-dialog";

/**
 * MemberDropdown component provides a user profile dropdown menu with member information
 * and navigation options. This component displays the current user's avatar, name, and
 * membership tier, along with quick access to profile settings, billing, and logout.
 *
 * The dropdown includes:
 * - User avatar and basic profile information
 * - Membership tier badge with appropriate styling
 * - Navigation links to profile, settings, and billing
 * - Logout functionality
 *
 * This component is typically placed in the header or navigation area and provides
 * a consistent way for authenticated users to access their account-related features.
 *
 * @returns JSX.Element - The member dropdown component
 */
export function MemberDropdown() {
  const router = useRouter();
  const { signOut } = useClerk();
  const currentMember = useQuery(api.auth.current);
  
  // State to control dropdown open/closed state for programmatic control
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  /**
   * Handles navigation to the user's profile page.
   */
  const handleProfileClick = () => {
    if (currentMember?.slug) {
      router.push(`/members/${currentMember.slug}`);
    }
    setIsOpen(false);
  };

  /**
   * Handles opening the settings dialog.
   */
  const handleSettingsClick = () => {
    setSettingsOpen(true);
    setIsOpen(false);
  };

  /**
   * Handles the user logout process.
   */
  const handleLogout = () => {
    signOut();
    setIsOpen(false);
  };


  if (!currentMember) {
    return null;
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {/* Avatar-only trigger */}
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-full outline-none ring-2 ring-transparent hover:ring-muted-foreground/20 transition-all duration-200 focus-visible:ring-ring"
          aria-label="Open user menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentMember.avatarUrl} alt={currentMember.firstName} />
            <AvatarFallback className="text-xs font-medium bg-muted">
              {currentMember.firstName?.[0]}
              {currentMember.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      {/* Dropdown content with user info and navigation options */}
      <DropdownMenuContent align="end" className="w-64">
        {/* User information header section */}
        <div className="flex items-center gap-3 px-2 py-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={currentMember.avatarUrl} alt={currentMember.firstName} />
            <AvatarFallback className="text-sm font-medium bg-muted">
              {currentMember.firstName?.[0]}
              {currentMember.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {currentMember.firstName} {currentMember.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentMember.email}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Profile navigation item */}
        <DropdownMenuItem
          onClick={handleProfileClick}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>

        {/* Settings navigation item */}
        <DropdownMenuItem
          onClick={handleSettingsClick}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Theme toggle section */}
        <div className="px-2 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Theme</p>
          <ThemeToggleSwitch className="w-full" />
        </div>

        <DropdownMenuSeparator />

        {/* Logout action item */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Settings Dialog */}
    <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}