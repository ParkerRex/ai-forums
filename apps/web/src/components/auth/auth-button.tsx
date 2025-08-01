"use client";

import React from "react";
import { Button } from "../components/ui/button";
import { SignInButton } from "@clerk/nextjs";

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
