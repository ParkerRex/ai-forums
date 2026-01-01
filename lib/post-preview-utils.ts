export interface PostData {
  id: string;
  title: string;
  content: string;
  preview?: string;
  isFree?: boolean;
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
  isPinned?: boolean;
  pinScope?: "category" | "global" | "both";
  member?: {
    id: string;
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

export function getPostPreviewAsset(post: PostData): {
  type: "image" | "video" | "link" | "text" | "poll";
  url?: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
} {
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

export function getContentExcerpt(
  content: string,
  maxLength: number = 150,
  preview?: string,
): string {
  if (preview?.trim()) {
    return preview;
  }

  const plainText = content.replace(/<[^>]*>/g, "");

  if (plainText.length <= maxLength) {
    return plainText;
  }

  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  return lastSpace > 0 ? `${truncated.substring(0, lastSpace)}...` : `${truncated}...`;
}

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

function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return count.toString();
}

export interface AssetInfo {
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

export function getAssetOrientation(asset?: AssetInfo): "portrait" | "landscape" | "square" {
  if (!asset) return "landscape";

  const width = asset.naturalWidth || asset.width || 16;
  const height = asset.naturalHeight || asset.height || 9;
  const ratio = width / height;

  if (ratio > 1.2) return "landscape";
  if (ratio < 0.8) return "portrait";
  return "square";
}

export function getPreviewClasses(
  size: PreviewSize,
  asset?: AssetInfo,
  post?: PostData,
): {
  wrapper: string;
  media: string;
  aspectRatio: string;
  dynamicStyle?: React.CSSProperties;
} {
  if (post?.aspectRatio && post?.mediaWidth && post?.mediaHeight) {
    const aspectRatio = post.aspectRatio;

    return {
      wrapper: "w-full",
      media: "object-contain",
      aspectRatio: "",
      dynamicStyle: {
        aspectRatio: aspectRatio.toString(),
      },
    };
  }

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

export function hasMedia(post: PostData): boolean {
  return post.type === "image" || post.type === "video";
}

export function isLinkPost(post: PostData): boolean {
  return post.type === "link";
}

export function isPollPost(post: PostData): boolean {
  return post.type === "poll";
}

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

export function shouldAutoplay(post: PostData, userPreference: boolean = true): boolean {
  if (!userPreference) return false;
  if (post.type !== "video") return false;
  return true;
}

export function getMediaPlaceholder(): string {
  return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes("youtu.be")) {
      return urlObj.pathname.slice(1);
    }
    if (urlObj.hostname.includes("youtube.com") && urlObj.searchParams.has("v")) {
      return urlObj.searchParams.get("v");
    }

    return null;
  } catch {
    return null;
  }
}
