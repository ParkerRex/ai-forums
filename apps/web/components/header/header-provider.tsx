"use client";

import { TooltipProvider } from "@/web/components/ui/tooltip";

interface HeaderProviderProps {
  children: React.ReactNode;
}

export const HeaderProvider = ({ children }: HeaderProviderProps) => {
  return <TooltipProvider>{children}</TooltipProvider>;
};
