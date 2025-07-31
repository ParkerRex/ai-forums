"use client";

import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/web/components/ui/avatar";
import { Id } from "@/web/convex/_generated/dataModel";

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

  console.log("MentionAutocomplete: Component rendered with props:", {
    itemsCount: items?.length,
    hasOnSelect: typeof onSelect === "function",
    hasOnClose: typeof onClose === "function",
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    if (!Array.isArray(items)) {
      console.error(
        "[MentionAutocomplete] Expected 'items' prop to be an array, but received:",
        items,
        "(type:",
        typeof items,
        ") – Check caller component prop mismatch.",
      );
    }

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
      className="bg-popover border-border z-50 w-72 rounded-md border shadow-xl"
    >
      {items.length > 0 && (
        <div className="text-muted-foreground border-border bg-muted/50 border-b px-3 py-2 text-xs font-medium">
          Mention a member
        </div>
      )}
      <div className="max-h-64 overflow-y-auto">
        {items.map((member, index) => (
          <div
            key={member._id}
            className={`hover:bg-accent flex cursor-pointer items-center gap-3 px-3 py-2 ${
              index === selectedIndex ? "bg-accent" : ""
            }`}
            onClick={() => {
              console.log("MentionAutocomplete: Member clicked:", member);
              console.log(
                "MentionAutocomplete: About to call onSelect with member:",
                member,
              );
              onSelect(member);
              console.log("MentionAutocomplete: onSelect called successfully");
            }}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {member.firstName[0]}
                {member.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-foreground truncate text-sm font-medium">
                {member.firstName} {member.lastName}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                @{member.slug}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
