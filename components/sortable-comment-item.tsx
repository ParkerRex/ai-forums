"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

interface SortableCommentItemProps {
  comment: { _id: string };
  children: React.ReactNode;
  disabled?: boolean;
}

export function SortableCommentItem({
  comment,
  children,
  disabled = false,
}: SortableCommentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: comment._id, 
    disabled 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {React.cloneElement(children as React.ReactElement<{
        dragHandleProps?: { [key: string]: unknown };
        isDragging?: boolean;
      }>, {
        dragHandleProps: { ...attributes, ...listeners },
        isDragging,
      })}
    </div>
  );
}
