"use client";

import { useEffect, useState, useCallback } from "react";

function isInputFree(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  if (!target || !target.tagName) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();

  // Don't trigger if user is typing in an input field
  if (tagName === 'input' || tagName === 'textarea' || target.contentEditable === 'true') {
    return false;
  }

  return true;
}

export type SortOption = "newest" | "popular" | "trending";

interface UseSortHotkeyProps {
  onSortChange?: (sort: SortOption) => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export function useSortHotkey({ onSortChange, isOpen: controlledIsOpen, setIsOpen: setControlledIsOpen }: UseSortHotkeyProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = setControlledIsOpen || setInternalIsOpen;

  const handleSortSelection = useCallback((sortOption: SortOption) => {
    onSortChange?.(sortOption);
    setIsOpen(false);
  }, [onSortChange, setIsOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle 'S' key to open sort menu
      if (e.key && e.key.toLowerCase() === 's' && isInputFree(e) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen(!isOpen);
        return;
      }
      
      // Handle number keys for quick selection when popover is open
      if (isOpen) {
        switch(e.key) {
          case '1':
            e.preventDefault();
            handleSortSelection("newest");
            break;
          case '2':
            e.preventDefault();
            handleSortSelection("popular");
            break;
          case '3':
            e.preventDefault();
            handleSortSelection("trending");
            break;
          case 'Escape':
            e.preventDefault();
            setIsOpen(false);
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen, handleSortSelection]);

  const openSort = () => setIsOpen(true);
  const closeSort = () => setIsOpen(false);

  return {
    isOpen,
    openSort,
    closeSort,
    setIsOpen,
  };
}