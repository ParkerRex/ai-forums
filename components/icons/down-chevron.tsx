"use client";

import type * as React from "react";

/**
 * Props interface for the DownChevronIcon component
 * Extends standard SVG element props to allow customization
 */
interface DownChevronIconProps extends React.SVGProps<SVGSVGElement> {
  /** Size of the icon in pixels, defaults to 24 */
  size?: number;
  /** Custom className for styling overrides */
  className?: string;
}

/**
 * DownChevronIcon component that renders an animated chevron pointing downward
 *
 * This icon features a smooth animation when rendered, with the stroke drawing
 * itself in over 0.3 seconds. The chevron points downward and uses currentColor
 * for the stroke, making it easily themeable.
 *
 * @param size - The width and height of the icon in pixels (default: 24)
 * @param className - Additional CSS classes to apply to the SVG element
 * @param props - Any additional SVG props to pass through
 * @returns A React SVG element representing a downward-pointing chevron
 */
export function DownChevronIcon({ size = 24, className, ...props }: DownChevronIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      {...props}
    >
      {/* 
        Animated chevron path that draws itself in on render
        Uses stroke-dasharray and stroke-dashoffset for the animation effect
        The path creates two lines forming a downward-pointing chevron
      */}
      <path
        fill="none"
        stroke="currentColor"
        strokeDasharray="10"
        strokeDashoffset="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 15l-5 -5M12 15l5 -5"
      >
        {/* 
          Animation that transitions the stroke-dashoffset from 10 to 0
          This creates the effect of the chevron drawing itself in over 0.3 seconds
          The animation freezes at the end state to maintain the fully drawn chevron
        */}
        <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.3s" values="10;0" />
      </path>
    </svg>
  );
}

/**
 * Default export for convenient importing
 * Allows both named and default imports of the component
 */
export default DownChevronIcon;
