"use client";

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  return (
    <SignInButton mode="modal">
      <Button
        variant="default"
        size="default"
        className="h-[24px] border border-black bg-white text-black hover:bg-black hover:text-white"
      >
        MEMBERS
      </Button>
    </SignInButton>
  );
}
