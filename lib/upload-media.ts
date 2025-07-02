import { api } from "@/convex/_generated/api";
import { ConvexReactClient } from "convex/react";

export interface UploadResult {
  url: string;
  thumbnailUrl?: string;
  objectKey: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  generateThumbnail?: boolean;
  useServerUpload?: boolean;
}

/**
 * Convert file to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/jpeg;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

/**
 * Upload via server (bypasses CORS)
 */
async function uploadViaServer(
  convex: ConvexReactClient,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { onProgress } = options;

  try {
    // Convert file to base64
    onProgress?.({ loaded: 0, total: 100, percentage: 0 });
    
    const base64Data = await fileToBase64(file);
    onProgress?.({ loaded: 50, total: 100, percentage: 50 });

    // Upload via Convex action
    const result = await convex.action(api.storage.uploadFile, {
      fileData: base64Data,
      contentType: file.type,
      fileName: file.name,
    });

    onProgress?.({ loaded: 100, total: 100, percentage: 100 });

    return {
      url: result.publicUrl,
      objectKey: result.objectKey,
    };
  } catch (error) {
    console.error("Server upload failed:", error);
    throw new Error("Server upload failed. Please try again.");
  }
}

/**
 * Upload via direct client upload (requires CORS)
 */
async function uploadViaDirect(
  convex: ConvexReactClient,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { onProgress } = options;

  // Get presigned upload URL from Convex
  const { uploadUrl, objectKey, publicUrl } = await convex.action(
    api.storage.generateUploadUrl,
    {
      contentType: file.type,
      fileName: file.name,
    }
  );

  // Upload file directly to R2
  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          url: publicUrl,
          objectKey,
          // TODO: Generate thumbnail for videos
        });
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

/**
 * Upload a media file to R2 storage via Convex
 */
export async function uploadMedia(
  convex: ConvexReactClient,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // Validate file
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    throw new Error("Only image and video files are supported");
  }

  // Try direct upload first, fallback to server upload on CORS error
  if (options.useServerUpload) {
    return uploadViaServer(convex, file, options);
  }

  try {
    return await uploadViaDirect(convex, file, options);
  } catch (error) {
    console.warn("Direct upload failed, trying server upload:", error);
    
    // If it's a network error (likely CORS), try server upload
    if (error instanceof Error && error.message.includes("Network error")) {
      return uploadViaServer(convex, file, options);
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Validate media file before upload
 */
export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

  const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  const ALLOWED_VIDEO_TYPES = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: "Image file must be less than 10MB" };
    }
    return { valid: true };
  }

  if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
    if (file.size > MAX_VIDEO_SIZE) {
      return { valid: false, error: "Video file must be less than 100MB" };
    }
    return { valid: true };
  }

  return {
    valid: false,
    error: "File type not supported. Please upload an image or video.",
  };
}

/**
 * Extract video thumbnail (stub - would use video element + canvas in production)
 */
export async function extractVideoThumbnail(file: File): Promise<string | null> {
  // TODO: Implement video thumbnail extraction
  // This would create a video element, seek to first frame,
  // draw to canvas, and export as data URL
  console.log("Video thumbnail extraction not implemented for:", file.name);
  return null;
}

/**
 * Get file preview URL for display before upload
 */
export function getFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Clean up preview URL when no longer needed
 */
export function revokeFilePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export function extractImageDimensions(file: File): Promise<{ width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspectRatio = width / height;
      
      URL.revokeObjectURL(url);
      resolve({ width, height, aspectRatio });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for dimension extraction'));
    };
    
    img.src = url;
  });
}

export function extractVideoDimensions(file: File): Promise<{ width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const aspectRatio = width / height;
      
      URL.revokeObjectURL(url);
      resolve({ width, height, aspectRatio });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video for dimension extraction'));
    };
    
    video.src = url;
  });
}

export async function extractMediaDimensions(file: File): Promise<{ width: number; height: number; aspectRatio: number }> {
  if (file.type.startsWith('image/')) {
    return extractImageDimensions(file);
  } else if (file.type.startsWith('video/')) {
    return extractVideoDimensions(file);
  } else {
    throw new Error('Unsupported file type for dimension extraction');
  }
}   