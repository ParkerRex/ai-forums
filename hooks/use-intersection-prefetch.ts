"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function useIntersectionPrefetch(href: string) {
  const ref = useRef<HTMLAnchorElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!ref.current || !href) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Prefetch the route when it comes into view
            router.prefetch(href);
            // Disconnect after prefetching to avoid repeated calls
            observer.disconnect();
          }
        });
      },
      {
        // Trigger when element is 50% visible
        threshold: 0.5,
        // Start prefetching when element is 100px away from viewport
        rootMargin: "100px",
      },
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [href, router]);

  return ref;
}
