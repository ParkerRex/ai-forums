import { action } from "./_generated/server";
import { v } from "convex/values";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// This file handles Cloudflare R2 storage integration
// Note: You'll need to set up the following environment variables:
// - R2_ACCOUNT_ID
// - R2_ACCESS_KEY
// - R2_SECRET_KEY
// - R2_BUCKET
// - R2_PUBLIC_URL (e.g., https://your-bucket.r2.dev)

// Initialize S3 client for R2
function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY;
  const secretKey = process.env.R2_SECRET_KEY;

  if (!accountId || !accessKey || !secretKey) {
    throw new Error("Missing R2 environment variables. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY, and R2_SECRET_KEY");
  }

  return new S3Client({
    region: "auto", // R2 uses "auto" as the region
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
}

// NEW HELPER ──────────────────────────────────────────────────────────────
/**
 * Derive a public base URL for objects stored in the R2 bucket.
 *
 * 1. Accepts an optional `process.env.R2_PUBLIC_URL`.
 * 2. Works for both `*.r2.dev` and `*.cloudflarestorage.com` hosts.
 * 3. Never throws – if the supplied value is malformed it gracefully falls back
 *    to the default Cloudflare R2 endpoint.
 * 4. Ensures the bucket path is appended exactly once for
 *    `cloudflarestorage.com` hosts (it is **not** required for `r2.dev`).
 */
function getPublicBase(bucket: string): string {
  const provided = process.env.R2_PUBLIC_URL?.trim();

  // Fallback to the standard Cloudflare URL if nothing was configured.
  if (!provided) {
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}`;
  }

  // Ensure we have a protocol ‑ if not, prepend https so URL parsing works.
  const withProtocol = /^(https?:)?\/\//.test(provided) ? provided : `https://${provided}`;

  let host: string;
  let path: string;

  // Use try/catch so we never crash at runtime because of an invalid URL.
  try {
    const url = new URL(withProtocol);
    host = url.host;
    path = url.pathname.replace(/\/$/, ""); // strip trailing slash from pathname
  } catch {
    // Malformed URL – fall back to default endpoint instead of throwing.
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}`;
  }

  // For `cloudflarestorage.com` hosts we need a `/<bucket>` path segment.
  if (host.endsWith("cloudflarestorage.com")) {
    if (path === `/${bucket}`) {
      // Correct path already present – return as-is (minus trailing slash).
      return withProtocol.replace(/\/$/, "");
    }
    // Ensure we only append the bucket path once.
    return `${withProtocol.replace(/\/$/, "")}/${bucket}`;
  }

  // For `r2.dev` and any other custom domains we just return the provided URL
  // (without a trailing slash) since they already point at the bucket.
  return withProtocol.replace(/\/$/, "");
}
// ──────────────────────────────────────────────────────────────────────────

export const generateUploadUrl = action({
  args: {
    contentType: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const bucket = process.env.R2_BUCKET;
    if (!bucket) {
      throw new Error("R2_BUCKET environment variable is not set");
    }

    // Validate content type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validImageTypes.includes(args.contentType.toLowerCase())) {
      throw new Error(`Invalid image type. Supported types: ${validImageTypes.join(', ')}`);
    }

    // Validate file extension
    const fileExtension = args.fileName.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      throw new Error(`Invalid file extension. Supported extensions: ${validExtensions.join(', ')}`);
    }

    try {
      const s3Client = createR2Client();
      
      // Generate a unique object key with sanitized filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const sanitizedExtension = fileExtension.replace(/[^a-z0-9]/gi, '');
      const objectKey = `uploads/${timestamp}-${randomId}.${sanitizedExtension}`;

      // Create the presigned URL for PUT operation
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: args.contentType,
        CacheControl: 'public, max-age=31536000, immutable', // 1 year cache
        Metadata: {
          'upload-timestamp': timestamp.toString(),
          'original-filename': args.fileName
        }
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 900 // 15 minutes
      });

      // Replace previous inline logic with helper to avoid duplication/bugs.
      const publicUrl = `${getPublicBase(bucket)}/${objectKey}`;

      return {
        uploadUrl,
        objectKey,
        publicUrl,
      };
    } catch (error) {
      console.error("Failed to generate upload URL:", error);
      throw new Error(`Failed to generate upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Server-side upload action to bypass CORS
export const uploadFile = action({
  args: {
    fileData: v.string(), // Base64 encoded file data
    contentType: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const bucket = process.env.R2_BUCKET;
    if (!bucket) {
      throw new Error("R2_BUCKET environment variable is not set");
    }

    // Validate content type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validImageTypes.includes(args.contentType.toLowerCase())) {
      throw new Error("Invalid image type");
    }

    try {
      const s3Client = createR2Client();
      
      // Generate a unique object key
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = args.fileName.split('.').pop();
      const objectKey = `uploads/${timestamp}-${randomId}.${fileExtension}`;

      // Convert base64 to buffer
      const fileBuffer = Buffer.from(args.fileData, 'base64');

      // Upload directly to R2
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: args.contentType,
      });

      await s3Client.send(command);

      // Use the same helper here too.
      const publicUrl = `${getPublicBase(bucket)}/${objectKey}`;


      return {
        objectKey,
        publicUrl,
      };
    } catch (error) {
      console.error("Failed to upload file:", error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const deleteObject = action({
  args: {
    objectKey: v.string(),
  },
  handler: async (ctx, args) => {
    const bucket = process.env.R2_BUCKET;
    if (!bucket) {
      console.error("R2_BUCKET environment variable is not set - skipping deletion");
      return { success: false, error: "Storage not configured" };
    }

    // Validate object key format
    if (!args.objectKey || !args.objectKey.startsWith('uploads/')) {
      console.error(`Invalid object key format: ${args.objectKey}`);
      return { success: false, error: "Invalid object key" };
    }

    try {
      const s3Client = createR2Client();
      
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: args.objectKey,
      });

      await s3Client.send(command);
      
      console.log(`Successfully deleted object: ${args.objectKey}`);
      return { success: true };
    } catch (error) {
      // Log error but don't throw - deletion failures shouldn't break the app
      console.error("Failed to delete object:", error);
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.name === 'NoSuchKey' || error.message.includes('404')) {
          // Object already deleted or doesn't exist
          return { success: true, note: "Object already deleted" };
        }
        if (error.message.includes('credentials') || error.message.includes('auth')) {
          // Configuration error - log but continue
          console.error("Storage credentials error - check R2 configuration");
          return { success: false, error: "Storage configuration error" };
        }
      }
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});

// Helper action to test R2 connection
export const testR2Connection = action({
  args: {},
  handler: async () => {
    try {
      const s3Client = createR2Client();
      
      // Test by generating a simple presigned URL
      const testKey = `test-${Date.now()}.txt`;
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: testKey,
        ContentType: "text/plain",
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });
      
      return {
        success: true,
        message: "R2 connection successful",
        testUploadUrl: url,
        bucket: process.env.R2_BUCKET,
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      };
    } catch (error) {
      console.error("R2 connection test failed:", error);
      return {
        success: false,
        message: `R2 connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
}); 