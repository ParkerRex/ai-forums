"use client";

import { LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { SettingsDialog } from "@/components/settings-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * MemberDropdown component provides a user profile dropdown menu with member information
 * and navigation options.
 */
export function MemberDropdown() {
  const router = useRouter();
  const { member: currentMember, logout } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleProfileClick = () => {
    if (currentMember?.slug) {
      router.push(`/members/${currentMember.slug}`);
    }
    setIsOpen(false);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  if (!currentMember) {
    return null;
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="relative rounded-none outline-hidden ring-2 ring-transparent hover:ring-muted-foreground/20 transition-all duration-200 focus-visible:ring-ring"
            aria-label="Open user menu"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={currentMember.avatarUrl ?? undefined}
                alt={currentMember.firstName}
              />
              <AvatarFallback className="text-xs font-medium bg-muted">
                {currentMember.firstName?.[0]}
                {currentMember.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center gap-3 px-2 py-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={currentMember.avatarUrl ?? undefined}
                alt={currentMember.firstName}
              />
              <AvatarFallback className="text-sm font-medium bg-muted">
                {currentMember.firstName?.[0]}
                {currentMember.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {currentMember.firstName} {currentMember.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{currentMember.email}</p>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
