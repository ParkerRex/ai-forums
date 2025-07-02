"use client";

import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Id } from "@/convex/_generated/dataModel";

interface MentionAutocompleteProps {
  items: Array<{
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    slug: string;
  }>;
  onSelect: (member: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    slug: string;
  }) => void;
  onClose: () => void;
}

export function MentionAutocomplete({
  items,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  console.log('MentionAutocomplete: Component rendered with props:', { 
    itemsCount: items?.length, 
    hasOnSelect: typeof onSelect === 'function',
    hasOnClose: typeof onClose === 'function'
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!items || items.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % items.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
          break;
        case "Enter":
          e.preventDefault();
          if (items[selectedIndex]) {
            onSelect(items[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onSelect, onClose]);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="w-64 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
    >
      {items.map((member, index) => (
        <div
          key={member._id}
          className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent ${
            index === selectedIndex ? "bg-accent" : ""
          }`}
          onClick={() => {
            console.log('MentionAutocomplete: Member clicked:', member);
            console.log('MentionAutocomplete: About to call onSelect with member:', member);
            onSelect(member);
            console.log('MentionAutocomplete: onSelect called successfully');
          }}
        >
          <Avatar className="w-6 h-6">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {member.firstName[0]}{member.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {member.firstName} {member.lastName}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              @{member.slug}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
