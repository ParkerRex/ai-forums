"use client";

import React from "react";
import { Button } from "./ui/button";
import { KeyIcon, KeyIconHandle } from "./ui/key";
import { SignUpButton } from "@clerk/nextjs";

export function AuthButton() {
  const keyIconRef = React.useRef<KeyIconHandle>(null);

  return (
    <SignUpButton mode="modal">
      <Button
        variant="default"
        size="sm"
        className="gap-2"
        onMouseEnter={() => keyIconRef.current?.startAnimation()}
        onMouseLeave={() => keyIconRef.current?.stopAnimation()}
      >
        <KeyIcon ref={keyIconRef} size={16} />
        <span>Sign In / Sign Up</span>
      </Button>
    </SignUpButton>
  );
}
