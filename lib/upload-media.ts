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
  skipThumbnail?: boolean;
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

    // Extract thumbnail for videos
    let thumbnailUrl: string | undefined;
    if (file.type.startsWith('video/') && !options.skipThumbnail) {
      const thumbnailDataUrl = await extractVideoThumbnail(file);
      if (thumbnailDataUrl) {
        // Convert data URL to file and upload
        const thumbnailBlob = await fetch(thumbnailDataUrl).then(r => r.blob());
        const thumbnailFile = new File([thumbnailBlob], `${file.name}-thumbnail.jpg`, { type: 'image/jpeg' });
        
        try {
          const thumbnailResult = await uploadViaServer(convex, thumbnailFile, { ...options, skipThumbnail: true });
          thumbnailUrl = thumbnailResult.url;
        } catch (error) {
          console.error('Failed to upload video thumbnail:', error);
        }
      }
    }

    return {
      url: result.publicUrl,
      objectKey: result.objectKey,
      thumbnailUrl,
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

    xhr.addEventListener("load", async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Extract thumbnail for videos
        let thumbnailUrl: string | undefined;
        if (file.type.startsWith('video/') && !options.skipThumbnail) {
          const thumbnailDataUrl = await extractVideoThumbnail(file);
          if (thumbnailDataUrl) {
            // Convert data URL to file and upload
            const thumbnailBlob = await fetch(thumbnailDataUrl).then(r => r.blob());
            const thumbnailFile = new File([thumbnailBlob], `${file.name}-thumbnail.jpg`, { type: 'image/jpeg' });
            
            try {
              const thumbnailResult = await uploadViaDirect(convex, thumbnailFile, { ...options, skipThumbnail: true });
              thumbnailUrl = thumbnailResult.url;
            } catch (error) {
              console.error('Failed to upload video thumbnail:', error);
            }
          }
        }
        
        resolve({
          url: publicUrl,
          objectKey,
          thumbnailUrl,
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
  const allowedTypes = [
    "image/",
    "video/",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  
  // Treat types ending with a trailing slash (e.g., "image/", "video/") as prefixes
  // and match all others exactly. This prevents types like "application/pdf-malicious"
  // from bypassing validation.
  const isAllowed = allowedTypes.some((type) =>
    type.endsWith("/") ? file.type.startsWith(type) : file.type === type
  );
  
  if (!isAllowed) {
    throw new Error("Only image, video, PDF, and Word documents are supported");
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
  const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB
  const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20MB

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

  const ALLOWED_PDF_TYPES = [
    "application/pdf",
  ];

  const ALLOWED_DOC_TYPES = [
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
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

  if (ALLOWED_PDF_TYPES.includes(file.type)) {
    if (file.size > MAX_PDF_SIZE) {
      return { valid: false, error: "PDF file must be less than 20MB" };
    }
    return { valid: true };
  }

  if (ALLOWED_DOC_TYPES.includes(file.type)) {
    if (file.size > MAX_DOC_SIZE) {
      return { valid: false, error: "Word document must be less than 20MB" };
    }
    return { valid: true };
  }

  return {
    valid: false,
    error: "File type not supported. Please upload an image, video, PDF, or Word document.",
  };
}

const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20MB

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain", // .txt
  "text/markdown", // .md
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/csv", // .csv
];

/**
 * Validate document file for paperclip uploads (text-based files only)
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "File type not supported. Please upload PDF, Word, PowerPoint, Excel, text, or markdown documents.",
    };
  }

  if (file.size > MAX_DOC_SIZE) {
    return { valid: false, error: "Document must be less than 20MB" };
  }

  return { valid: true };
}

/**
 * Extract video thumbnail using video element and canvas
 */
export async function extractVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      resolve(null);
      return;
    }

    // Create object URL for the video file
    const videoUrl = URL.createObjectURL(file);
    
    video.addEventListener('loadedmetadata', () => {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Seek to 1 second (or 10% of duration if video is short)
      video.currentTime = Math.min(1, video.duration * 0.1);
    });
    
    video.addEventListener('seeked', () => {
      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob with reasonable quality
      canvas.toBlob((blob) => {
        if (blob) {
          // Convert blob to data URL
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            URL.revokeObjectURL(videoUrl);
            resolve(dataUrl);
          };
          reader.readAsDataURL(blob);
        } else {
          URL.revokeObjectURL(videoUrl);
          resolve(null);
        }
      }, 'image/jpeg', 0.8);
    });
    
    video.addEventListener('error', () => {
      console.error('Error loading video for thumbnail extraction');
      URL.revokeObjectURL(videoUrl);
      resolve(null);
    });
    
    // Set video source and load
    video.src = videoUrl;
    video.load();
  });
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
  } else if (file.type === 'application/pdf') {
    // For PDFs, we'll use a standard aspect ratio since dimensions aren't meaningful
    return { width: 850, height: 1100, aspectRatio: 850 / 1100 }; // Standard US Letter aspect ratio
  } else if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // For Word documents, use a standard document aspect ratio
    return { width: 850, height: 1100, aspectRatio: 850 / 1100 }; // Standard US Letter aspect ratio
  } else {
    throw new Error('Unsupported file type for dimension extraction');
  }
}   