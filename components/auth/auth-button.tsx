"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { KeyIcon, KeyIconHandle } from "@/components/icons/key";
import { SignInButton } from "@clerk/nextjs";

export function AuthButton() {
  const keyIconRef = React.useRef<KeyIconHandle>(null);

  return (
    <SignInButton mode="modal">
      <Button
        variant="default"
        size="default"
        className="gap-2"
        onMouseEnter={() => keyIconRef.current?.startAnimation()}
        onMouseLeave={() => keyIconRef.current?.stopAnimation()}
      >
        <KeyIcon ref={keyIconRef} size={16} />
        <span>Members Only</span>
      </Button>
    </SignInButton>
  );
}
