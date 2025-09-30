export interface MediaItem {
  id: string;
  type: "image" | "video" | "pdf" | "youtube";
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  order: number;
  // PDF specific
  pageCount?: number;
  fileSize?: number;
  // YouTube specific
  videoId?: string;
  title?: string;
  duration?: string;
  channelName?: string;
  // Video specific
  videoDuration?: string;
  format?: string;
  resolution?: string;
  codec?: string;
  // Common
  uploadProgress?: number;
  isUploading?: boolean;
  error?: string;
}

export interface CategorySelectorItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  postCount: number;
  isTrending?: boolean;
}
