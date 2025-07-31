"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { MediaItem } from "@/types";
import { MediaPreviewItem } from "./media-preview-item";
import { useState } from "react";

interface MediaPreviewGridProps {
  media: MediaItem[];
  onReorder: (media: MediaItem[]) => void;
  onRemove: (mediaId: string) => void;
  disabled?: boolean;
}

export function MediaPreviewGrid({
  media,
  onReorder,
  onRemove,
  disabled = false,
}: MediaPreviewGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortedMedia = useMemo(
    () => [...media].sort((a, b) => a.order - b.order),
    [media],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sortedMedia.findIndex((item) => item.id === active.id);
      const newIndex = sortedMedia.findIndex((item) => item.id === over?.id);

      const reorderedMedia = arrayMove(sortedMedia, oldIndex, newIndex);
      // Update order property
      const updatedMedia = reorderedMedia.map((item, index) => ({
        ...item,
        order: index,
      }));

      onReorder(updatedMedia);
    }

    setActiveId(null);
  };

  const activeItem = useMemo(
    () => sortedMedia.find((item) => item.id === activeId),
    [activeId, sortedMedia],
  );

  if (media.length === 0) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedMedia.map((item) => item.id)}
        strategy={rectSortingStrategy}
      >
        <div className="relative">
          {media.length > 12 && (
            <div className="text-muted-foreground mb-2 text-xs">
              Scroll to see all {media.length} items
            </div>
          )}
          <div className="bg-muted/10 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent max-h-[300px] overflow-y-auto rounded-none border p-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {sortedMedia.map((item) => (
                <MediaPreviewItem
                  key={item.id}
                  media={item}
                  onRemove={() => onRemove(item.id)}
                  disabled={disabled}
                  isDragging={activeId === item.id}
                />
              ))}
            </div>
          </div>
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId && activeItem ? (
          <div className="h-24 w-24 cursor-grabbing">
            <MediaPreviewItem
              media={activeItem}
              onRemove={() => {}}
              disabled={true}
              isDragOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
