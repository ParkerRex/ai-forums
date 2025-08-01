"use client";

import { TooltipProvider } from "../components/ui/tooltip";

interface HeaderProviderProps {
  children: React.ReactNode;
}

export const HeaderProvider = ({ children }: HeaderProviderProps) => {
  return <TooltipProvider>{children}</TooltipProvider>;
};
