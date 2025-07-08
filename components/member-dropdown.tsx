"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, User, Settings, CreditCard, LogOut } from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

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
   * Handles navigation to the account settings page.
   */
  const handleSettingsClick = () => {
    router.push("/settings");
    setIsOpen(false);
  };

  /**
   * Handles navigation to the billing page.
   */
  const handleBillingClick = () => {
    router.push("/settings/billing");
    setIsOpen(false);
  };

  /**
   * Handles the user logout process.
   */
  const handleLogout = () => {
    signOut();
    setIsOpen(false);
  };

  /**
   * Gets the appropriate styling classes for the membership tier badge.
   * Monochromatic design with subtle variations.
   *
   * @param tier - The membership tier
   * @returns string - CSS classes for the badge styling
   */
  const getTierBadgeStyle = (tier: string | undefined) => {
    if (!tier) return "";
    
    switch (tier.toLowerCase()) {
      case "founding_member":
      case "early_bird":
      case "member":
      case "scholarship":
        return "bg-foreground text-background";
      case "free":
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  /**
   * Gets the display text for the membership tier.
   */
  const getTierDisplayName = (tier: string | undefined) => {
    if (!tier) return "Free";
    
    switch (tier) {
      case "founding_member":
        return "Founding";
      case "early_bird":
        return "Early Bird";
      case "member":
        return "Pro";
      case "scholarship":
        return "Scholarship";
      case "free":
      default:
        return "Free";
    }
  };

  if (!currentMember) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {/* Dropdown trigger button with user avatar and chevron indicator */}
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 py-1.5 h-auto hover:bg-accent"
        >
          {/* User avatar with fallback to initials */}
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentMember.avatarUrl} alt={currentMember.firstName} />
            <AvatarFallback className="text-xs font-medium bg-muted">
              {currentMember.firstName?.[0]}
              {currentMember.lastName?.[0]}
            </AvatarFallback>
          </Avatar>

          {/* User name with responsive visibility */}
          <span className="hidden sm:block text-sm font-medium">
            {currentMember.firstName} {currentMember.lastName}
          </span>

          {/* Chevron down icon */}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </Button>
      </DropdownMenuTrigger>

      {/* Dropdown content with user info and navigation options */}
      <DropdownMenuContent align="end" className="w-56">
        {/* User information header section */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            {/* User name and email display */}
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {currentMember.firstName} {currentMember.lastName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {currentMember.email}
              </p>
            </div>

            {/* Membership tier badge */}
            <Badge
              variant="secondary"
              className={`w-fit text-xs ${getTierBadgeStyle(currentMember.tier)}`}
            >
              {getTierDisplayName(currentMember.tier)} Member
            </Badge>
          </div>
        </DropdownMenuLabel>

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

        {/* Billing navigation item */}
        <DropdownMenuItem
          onClick={handleBillingClick}
          className="cursor-pointer"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Billing</span>
        </DropdownMenuItem>

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
  );
}