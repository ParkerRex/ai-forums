"use client";

import { useEffect, useState } from "react";

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [clicked, setClicked] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    const down = () => setClicked(true);
    const up = () => setClicked(false);
    const leave = () => setHidden(true);
    const enter = () => setHidden(false);

    document.addEventListener("mousemove", move);
    document.addEventListener("mousedown", down);
    document.addEventListener("mouseup", up);
    document.addEventListener("mouseleave", leave);
    document.addEventListener("mouseenter", enter);

    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mousedown", down);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("mouseleave", leave);
      document.removeEventListener("mouseenter", enter);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none fixed left-0 top-0 z-[9999] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out ${
        hidden ? "opacity-0" : "opacity-100"
      }`}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
      }}
    >
      {/* Outer ring */}
      <div
        className={`relative flex h-6 w-6 items-center justify-center transition-transform duration-150 ease-out ${
          clicked ? "scale-75" : "scale-100"
        }`}
      >
        <div className="h-full w-full rounded-full border-2 border-primary" />
        {/* Inner dot */}
        <div className="absolute h-2 w-2 rounded-full bg-primary" />
      </div>
    </div>
  );
}
