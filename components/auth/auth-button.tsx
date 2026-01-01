"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  return (
    <Link href="/login">
      <Button
        variant="default"
        size="default"
        className="h-[24px] border border-black bg-white text-black hover:bg-black hover:text-white"
      >
        MEMBERS
      </Button>
    </Link>
  );
}
