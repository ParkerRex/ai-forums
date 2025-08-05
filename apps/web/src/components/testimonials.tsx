"use client";

import { cn } from "@/utils/cn";

const testimonials = [
  "I learn more here than at cursor events",
  "This community helped me learn better than everything",
  "YouTube is a cess pool",
  "There's a lot of dev-focused communities but this one is the right combination",
];

export default function Testimonials() {
  const rows = 3;
  return (
    <section className="relative w-full overflow-hidden py-16">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className={cn(
            "flex whitespace-nowrap will-change-transform gap-8 py-4 text-lg font-medium",
            rowIdx % 2 === 0 ? "animate-marquee" : "animate-marquee-reverse"
          )}
          style={{ animationDuration: `${20 + rowIdx * 5}s` }}
        >
          {[...testimonials, ...testimonials].map((quote, i) => (
            <span key={i} className="px-4 text-foreground">
              “{quote}”
            </span>
          ))}
        </div>
      ))}
    </section>
  );
}
