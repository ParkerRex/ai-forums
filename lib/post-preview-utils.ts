import { Id } from "@/convex/_generated/dataModel";

export interface PostData {
  _id: Id<"posts">;
  title: string;
  content: string;
  type?: "text" | "image" | "video" | "link" | "poll";
  mediaUrl?: string;
  thumbnailUrl?: string;
  aspectRatio?: number;
  mediaWidth?: number;
  mediaHeight?: number;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
  pollOptions?: Array<{
    id: string;
    text: string;
    voteCount: number;
  }>;
  pollEndsAt?: number;
  totalPollVotes?: number;
  createdAt: number;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  viewCount: number;
  member?: {
    _id: Id<"members">;
    firstName: string;
    lastName: string;
    username?: string;
    slug?: string;
    avatarUrl?: string | null;
  };
  category?: {
    name: string;
    displayName: string;
    icon?: string;
  };
}

export type PreviewSize = "small" | "medium" | "large";

/**
 * Get the appropriate preview asset for a post
 */
export function getPostPreviewAsset(post: PostData): {
  type: "image" | "video" | "link" | "text" | "poll";
  url?: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
} {
  // Normalize post type. If type is mistakenly set to "image" but the URL points
  // to a video file, treat it as a video. This makes the UI resilient to any
  // historic data issues before we fixed the post creation form.
  let postType: PostData["type"] = post.type || "text";

  if (
    postType === "image" &&
    typeof post.mediaUrl === "string" &&
    /\.(mp4|webm|mov)(\?.*)?$/i.test(post.mediaUrl)
  ) {
    postType = "video";
  }

  switch (postType) {
    case "image":
      return {
        type: "image",
        url: post.mediaUrl,
        thumbnailUrl: post.thumbnailUrl || post.mediaUrl,
      };
    
    case "video":
      return {
        type: "video",
        url: post.mediaUrl,
        thumbnailUrl: post.thumbnailUrl,
      };
    
    case "link":
      return {
        type: "link",
        url: post.linkUrl,
        thumbnailUrl: post.linkImage,
        title: post.linkTitle,
        description: post.linkDescription,
      };
    
    case "poll":
      return {
        type: "poll",
      };
    
    default:
      return {
        type: "text",
      };
  }
}

/**
 * Get content excerpt for preview
 */
export function getContentExcerpt(
  content: string,
  maxLength: number = 150
): string {
  // Strip HTML tags if present
  const plainText = content.replace(/<[^>]*>/g, "");
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  // Find the last complete word before maxLength
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  return lastSpace > 0 
    ? truncated.substring(0, lastSpace) + "..."
    : truncated + "...";
}

/**
 * Format post stats for display
 */
export function formatPostStats(post: PostData): {
  votes: string;
  comments: string;
  views: string;
  score: number;
} {
  const netVotes = post.upvotes - post.downvotes;
  
  return {
    votes: formatCount(netVotes),
    comments: formatCount(post.commentCount),
    views: formatCount(post.viewCount),
    score: netVotes,
  };
}

/**
 * Format large numbers for display
 */
function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return count.toString();
}

export interface AssetInfo {
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

/**
 * Determine asset orientation based on dimensions
 */
export function getAssetOrientation(asset?: AssetInfo): "portrait" | "landscape" | "square" {
  if (!asset) return "landscape";
  
  const width = asset.naturalWidth || asset.width || 16;
  const height = asset.naturalHeight || asset.height || 9;
  const ratio = width / height;
  
  if (ratio > 1.2) return "landscape";
  if (ratio < 0.8) return "portrait";
  return "square";
}

/**
 * Get preview classes for responsive media
 */
export function getPreviewClasses(
  size: PreviewSize,
  asset?: AssetInfo,
  post?: PostData
): {
  wrapper: string;
  media: string;
  aspectRatio: string;
  dynamicStyle?: React.CSSProperties;
} {
  // If we have actual dimensions, use them for dynamic sizing
  if (post?.aspectRatio && post?.mediaWidth && post?.mediaHeight) {
    const aspectRatio = post.aspectRatio;
    
    // For all sizes, let media display at full width with proper aspect ratio
    // Remove max height constraints to show media at actual size
    return {
      wrapper: "w-full",
      media: "object-contain",
      aspectRatio: "",
      dynamicStyle: {
        aspectRatio: aspectRatio.toString(),
      }
    };
  }
  
  // Fallback for posts without dimension data (legacy posts)
  const orientation = getAssetOrientation(asset);
  
  switch (size) {
    case "small":
      return {
        wrapper: "w-full",
        media: "object-contain",
        aspectRatio: orientation === "portrait" ? "aspect-[9/16]" : "aspect-video",
      };
    
    case "medium":
      return {
        wrapper: "w-full",
        media: "object-contain",
        aspectRatio: orientation === "portrait" ? "aspect-[9/16]" : "aspect-video",
      };
    
    case "large":
      return {
        wrapper: "w-full",
        media: "object-contain",
        aspectRatio: orientation === "portrait" ? "aspect-[9/16]" : "aspect-video",
      };
  }
}

/**
 * Get dimensions for preview based on size
 * @deprecated Use getPreviewClasses instead
 */
export function getPreviewDimensions(size: PreviewSize): {
  maxWidth: string;
  maxHeight: string;
  thumbnailSize: string;
} {
  switch (size) {
    case "small":
      return {
        maxWidth: "100px",
        maxHeight: "75px",
        thumbnailSize: "w-24 h-18",
      };
    
    case "medium":
      return {
        maxWidth: "200px",
        maxHeight: "150px",
        thumbnailSize: "w-48 h-36",
      };
    
    case "large":
      return {
        maxWidth: "100%",
        maxHeight: "400px",
        thumbnailSize: "w-full h-96",
      };
  }
}

/**
 * Check if post has media
 */
export function hasMedia(post: PostData): boolean {
  return post.type === "image" || post.type === "video";
}

/**
 * Check if post is a link post
 */
export function isLinkPost(post: PostData): boolean {
  return post.type === "link";
}

/**
 * Check if post is a poll
 */
export function isPollPost(post: PostData): boolean {
  return post.type === "poll";
}

/**
 * Get post type display name
 */
export function getPostTypeLabel(post: PostData): string {
  switch (post.type) {
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "link":
      return "Link";
    case "poll":
      return "Poll";
    default:
      return "Text";
  }
}

/**
 * Check if media should autoplay (for videos/GIFs)
 */
export function shouldAutoplay(
  post: PostData,
  userPreference: boolean = true
): boolean {
  if (!userPreference) return false;
  if (post.type !== "video") return false;
  
  // Don't autoplay if video is likely to have sound
  // In production, this would check video metadata
  return true;
}

/**
 * Get the appropriate placeholder for media loading
 */
export function getMediaPlaceholder(): string {
  // Return a base64 encoded 1x1 pixel placeholder
  // In production, this would return a properly sized blurred placeholder
  return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    } else if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }
    
    return null;
  } catch {
    return null;
  }
}          