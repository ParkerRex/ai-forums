"use client"

import Link from "next/link"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import type React from "react"

interface HeaderIconLinkProps {
  href: string
  tooltip: string
  children: React.ReactNode
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export const HeaderIconLink = ({ href, tooltip, children, onMouseEnter, onMouseLeave }: HeaderIconLinkProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="px-2 text-muted-foreground hover:text-foreground"
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
  )
}
