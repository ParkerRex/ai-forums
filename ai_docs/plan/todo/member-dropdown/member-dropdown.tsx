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
  // State to control dropdown open/closed state for programmatic control
  // This allows us to close the dropdown after certain actions if needed
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Handles navigation to the user's profile page.
   * This should redirect to the member profile where users can view and edit
   * their personal information, preferences, and account settings.
   */
  const handleProfileClick = () => {
    // TODO: Implement navigation to profile page
    // This should use Next.js router to navigate to /profile or similar
    console.log("Navigating to profile...");
    setIsOpen(false);
  };

  /**
   * Handles navigation to the account settings page.
   * This should redirect to a settings interface where users can manage
   * their account preferences, notification settings, and privacy options.
   */
  const handleSettingsClick = () => {
    // TODO: Implement navigation to settings page
    // This should use Next.js router to navigate to /settings or similar
    console.log("Navigating to settings...");
    setIsOpen(false);
  };

  /**
   * Handles navigation to the billing and subscription management page.
   * This should redirect to the Stripe customer portal or internal billing
   * interface where users can manage their subscription and payment methods.
   */
  const handleBillingClick = () => {
    // TODO: Implement navigation to billing page or Stripe customer portal
    // This should integrate with the Stripe customer portal for subscription management
    console.log("Navigating to billing...");
    setIsOpen(false);
  };

  /**
   * Handles the user logout process.
   * This should clear the user's authentication state and redirect them
   * to the login page or home page. Should also clear any cached user data.
   */
  const handleLogout = () => {
    // TODO: Implement logout functionality
    // This should clear authentication tokens and redirect to login/home
    console.log("Logging out user...");
    setIsOpen(false);
  };

  /**
   * Gets the appropriate styling classes for the membership tier badge.
   * Different tiers should have distinct visual styling to help users
   * quickly identify their membership level and associated benefits.
   *
   * @param tier - The membership tier (e.g., "Free", "Pro", "Premium")
   * @returns string - CSS classes for the badge styling
   */
  const getTierBadgeStyle = (tier: string) => {
    // Return appropriate styling based on membership tier
    // This provides visual hierarchy and helps users understand their benefits
    switch (tier.toLowerCase()) {
      case "premium":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
      case "pro":
        return "bg-blue-500 text-white";
      case "free":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  // Mock user data - in production this would come from authentication context
  // This should be replaced with actual user data from your auth system
  const mockUser = {
    name: "John Doe",
    email: "john.doe@example.com",
    avatar: "", // Empty string will show initials fallback
    tier: "Premium",
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {/* Dropdown trigger button with user avatar and chevron indicator */}
      {/* Uses ghost variant for subtle appearance in navigation contexts */}
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 py-1.5 h-auto hover:bg-background-secondary"
        >
          {/* User avatar with fallback to initials if no image provided */}
          {/* Consistent sizing that works well in navigation contexts */}
          <Avatar className="h-8 w-8">
            <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
            <AvatarFallback className="text-xs font-medium">
              {mockUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* User name with responsive visibility for smaller screens */}
          {/* Hidden on mobile to save space, visible on larger screens */}
          <span className="hidden sm:block text-sm font-medium text-foreground">
            {mockUser.name}
          </span>

          {/* Chevron down icon to indicate dropdown functionality */}
          {/* Rotates when dropdown is open for better visual feedback */}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </Button>
      </DropdownMenuTrigger>

      {/* Dropdown content with user info and navigation options */}
      {/* Properly sized and positioned for optimal user experience */}
      <DropdownMenuContent align="end" className="w-56">
        {/* User information header section */}
        {/* Displays key user details and membership status */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            {/* User name and email display */}
            {/* Provides context about which account is currently active */}
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {mockUser.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {mockUser.email}
              </p>
            </div>

            {/* Membership tier badge */}
            {/* Prominently displays the user's current subscription level */}
            <Badge
              variant="secondary"
              className={`w-fit text-xs ${getTierBadgeStyle(mockUser.tier)}`}
            >
              {mockUser.tier} Member
            </Badge>
          </div>
        </DropdownMenuLabel>

        {/* Separator between header and navigation items */}
        <DropdownMenuSeparator />

        {/* Profile navigation item */}
        {/* Allows users to access their profile page for account management */}
        <DropdownMenuItem
          onClick={handleProfileClick}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>

        {/* Settings navigation item */}
        {/* Provides access to account preferences and configuration options */}
        <DropdownMenuItem
          onClick={handleSettingsClick}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        {/* Billing navigation item */}
        {/* Links to subscription management and payment method updates */}
        <DropdownMenuItem
          onClick={handleBillingClick}
          className="cursor-pointer"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Billing</span>
        </DropdownMenuItem>

        {/* Separator before logout action */}
        <DropdownMenuSeparator />

        {/* Logout action item */}
        {/* Styled differently to indicate it's a destructive action */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
