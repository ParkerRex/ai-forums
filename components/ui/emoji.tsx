"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes, MouseEvent } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export interface EmojiIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface EmojiIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const pathVariants: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
    pathOffset: 0,
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    transition: {
      delay: 0.1,
      duration: 0.4,
      opacity: { duration: 0.1, delay: 0.1 },
    },
  },
};

const EmojiIcon = forwardRef<EmojiIconHandle, EmojiIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start("animate");
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start("normal");
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave],
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <motion.path
            variants={pathVariants}
            initial="normal"
            animate={controls}
            fillRule="evenodd"
            d="M2.48 6.504c-.943 1.633-.388 3.706.724 7.853c1.11 4.147 1.666 6.22 3.3 7.163s3.706.387 7.853-.724s6.22-1.666 7.163-3.3s.387-3.706-.724-7.853s-1.666-6.22-3.3-7.163s-3.706-.388-7.853.724c-4.147 1.11-6.22 1.666-7.163 3.3m5.705 9.247a.75.75 0 0 1 .91-.545c1.13.283 2.428.286 3.746-.067s2.44-1.005 3.278-1.815a.75.75 0 1 1 1.043 1.077a8.4 8.4 0 0 1-1.15.93l.159.32a1.5 1.5 0 1 1-2.693 1.323l-.196-.4l-.053.014c-1.555.417-3.112.42-4.499.073a.75.75 0 0 1-.545-.91m7.29-6.235c.215.8-.044 1.565-.577 1.707c-.534.143-1.14-.39-1.354-1.19s.044-1.564.577-1.707c.534-.143 1.14.39 1.354 1.19m-6.373 3.26c.534-.143.792-.907.578-1.707s-.82-1.333-1.354-1.19s-.792.907-.578 1.707s.82 1.333 1.354 1.19"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  },
);

EmojiIcon.displayName = "EmojiIcon";

export { EmojiIcon };
