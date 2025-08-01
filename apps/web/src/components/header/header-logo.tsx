"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";

export const HeaderLogo = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href="/" className="flex items-center">
          {/* Light mode logo */}
          <Image
            src="/vai-black.svg"
            alt="VAI logo"
            width={40}
            height={40}
            className="block dark:hidden"
            priority
          />
          {/* Dark mode logo */}
          <Image
            src="/vai-white.svg"
            alt="VAI logo"
            width={40}
            height={40}
            className="hidden dark:block"
            priority
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <p>Go to VAI Home</p>
      </TooltipContent>
    </Tooltip>
  );
};
