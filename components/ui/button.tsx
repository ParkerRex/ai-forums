import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive select-none min-w-[24px] min-h-[24px]",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black border border-[rgb(207,207,207)] hover:bg-white/90 active:bg-white/80 dark:bg-black dark:text-white dark:border-input dark:hover:bg-black/90 dark:active:bg-black/80",
        destructive:
          "bg-destructive text-white border border-[rgb(207,207,207)] hover:bg-destructive/90 active:bg-destructive/80 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-[rgb(207,207,207)] bg-white text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 dark:border-input dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 dark:active:bg-neutral-700",
        secondary:
          "bg-white text-neutral-900 border border-[rgb(207,207,207)] hover:bg-neutral-50 active:bg-neutral-100 dark:bg-neutral-900 dark:text-white dark:border-input dark:hover:bg-neutral-800 dark:active:bg-neutral-700",
        ghost:
          "text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200 dark:text-white dark:hover:bg-neutral-800 dark:active:bg-neutral-700",
        link: "text-[#ADADAD] underline-offset-4 hover:underline hover:text-black transition-colors duration-200 ease-out dark:text-[#707070] dark:hover:text-white",
        accent:
          "bg-accent text-accent-foreground border border-[rgb(207,207,207)] hover:bg-accent/90 active:bg-accent/80 dark:bg-accent dark:text-accent-foreground dark:border-input dark:hover:bg-accent/90 dark:active:bg-accent/80",
        cta:
          "bg-cta text-cta-foreground border-0 hover:bg-cta-hover active:bg-cta-active focus-visible:ring-cta/20 dark:focus-visible:ring-cta/40",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 px-2.5 py-1 text-xs gap-1",
        lg: "h-9 px-4 py-2",
        icon: "size-8 min-w-[24px] min-h-[24px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
