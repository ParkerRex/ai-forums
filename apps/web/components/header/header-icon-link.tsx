"use client";

import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/web/components/ui/tooltip";
import { Button } from "@/web/components/ui/button";
import type React from "react";

interface HeaderIconLinkProps {
  href: string;
  tooltip: string;
  children: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const HeaderIconLink = ({
  href,
  tooltip,
  children,
  onMouseEnter,
  onMouseLeave,
}: HeaderIconLinkProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground px-2"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          asChild
        >
          <Link href={href} className="flex items-center">
            {children}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};
