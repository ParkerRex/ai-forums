"use client";

import { useEffect, useState } from "react";

export function useCommandK() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openSearch = () => setIsOpen(true);
  const closeSearch = () => setIsOpen(false);

  return {
    isOpen,
    openSearch,
    closeSearch,
    setIsOpen,
  };
} 