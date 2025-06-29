"use client";

import { useEffect, useState } from "react";

function isInputFree(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  const tagName = target.tagName.toLowerCase();
  
  // Don't trigger if user is typing in an input field
  if (tagName === 'input' || tagName === 'textarea' || target.contentEditable === 'true') {
    return false;
  }
  
  return true;
}

export function useSearchHotkey() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle '/' key for search
      if (e.key === '/' && isInputFree(e)) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
      
      // Handle Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }
      
      // Handle Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
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