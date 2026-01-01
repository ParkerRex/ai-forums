// Bookmark-related type definitions

export type BookmarkTargetType = "post" | "comment" | "resource";

export interface Bookmark {
  id: string;
  memberId: string;
  targetId: string;
  targetType: BookmarkTargetType;
  createdAt: string;
  notes?: string;
  tags?: string[];
}

export interface BookmarkTarget {
  id: string;
  title: string;
  content: string;
  slug: string;
  createdAt: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
    avatarUrl: string | null;
  };
  category?: {
    id: string;
    name: string;
    displayName: string;
  };
}

export interface BookmarkWithTarget extends Bookmark {
  target?: BookmarkTarget;
}

export interface ToggleBookmarkInput {
  targetId: string;
  targetType: BookmarkTargetType;
}

export interface ToggleBookmarkResult {
  bookmarked: boolean;
}
