import * as React from "react"

import { cn } from "@/lib/utils"

export type CardSize = "default" | "compact"

export function cardSizeClass(size: CardSize = "default"): string {
  switch (size) {
    case "compact":
      return "py-3 px-4 gap-3"
    case "default":
    default:
      return "py-6 px-6 gap-6"
  }
}

interface CardProps extends React.ComponentProps<"div"> {
  size?: CardSize
}

function Card({ size = "default", className, ...props }: CardProps) {
  const sizeClasses = size === "compact" ? "gap-3" : "gap-6"
  const paddingClasses = size === "compact" ? "py-3" : "py-6"
  
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm",
        sizeClasses,
        paddingClasses,
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "[*[data-size=default]_&]:px-6 [*[data-size=default]_&.border-b]:pb-6",
        "[*[data-size=compact]_&]:px-4 [*[data-size=compact]_&.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "[*[data-size=default]_&]:px-6",
        "[*[data-size=compact]_&]:px-4",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center",
        "[*[data-size=default]_&]:px-6 [*[data-size=default]_&.border-t]:pt-6",
        "[*[data-size=compact]_&]:px-4 [*[data-size=compact]_&.border-t]:pt-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
