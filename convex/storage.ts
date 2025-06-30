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

    try {
      const s3Client = createR2Client();
      
      // Generate a unique object key
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = args.fileName.split('.').pop();
      const objectKey = `uploads/${timestamp}-${randomId}.${fileExtension}`;

      // Create the presigned URL for PUT operation
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: args.contentType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 900 // 15 minutes
      });

      // Build public base URL. If R2_PUBLIC_URL is provided, ensure the bucket path
      // is present (Cloudflare `r2.dev` endpoints require `/<bucket>` after the host).
      let publicBase: string;
      if (process.env.R2_PUBLIC_URL) {
        const trimmed = process.env.R2_PUBLIC_URL.replace(/\/$/, "");

        // If the host is the account endpoint (…cloudflarestorage.com), we still need the
        // bucket path. For custom domains or the public-dev URL (pub-….r2.dev) the bucket
        // is already implied by DNS, so we should NOT append it again.
        const host = new URL(trimmed).hostname;
        const needsBucketPath = host.endsWith("cloudflarestorage.com");

        publicBase = needsBucketPath ? `${trimmed}/${bucket}` : trimmed;
      } else {
        publicBase = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}`;
      }

      const publicUrl = `${publicBase}/${objectKey}`;

      // DEBUG LOGS – remove once issue is resolved
      console.log("[R2 DEBUG] generateUploadUrl", {
        bucket,
        R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
        constructedPublicBase: publicBase,
        objectKey,
        publicUrl,
        uploadUrlPreview: uploadUrl?.slice(0, 60) + "...", // shorten for log readability
      });

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

      // Build public base URL. If R2_PUBLIC_URL is provided, ensure the bucket path
      // is present (Cloudflare `r2.dev` endpoints require `/<bucket>` after the host).
      let publicBase: string;
      if (process.env.R2_PUBLIC_URL) {
        const trimmed = process.env.R2_PUBLIC_URL.replace(/\/$/, "");

        // If the host is the account endpoint (…cloudflarestorage.com), we still need the
        // bucket path. For custom domains or the public-dev URL (pub-….r2.dev) the bucket
        // is already implied by DNS, so we should NOT append it again.
        const host = new URL(trimmed).hostname;
        const needsBucketPath = host.endsWith("cloudflarestorage.com");

        publicBase = needsBucketPath ? `${trimmed}/${bucket}` : trimmed;
      } else {
        publicBase = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}`;
      }

      const publicUrl = `${publicBase}/${objectKey}`;

      // DEBUG LOGS – remove once issue is resolved
      console.log("[R2 DEBUG] uploadFile", {
        bucket,
        R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
        constructedPublicBase: publicBase,
        objectKey,
        publicUrl,
      });

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
      throw new Error("R2_BUCKET environment variable is not set");
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
      console.error("Failed to delete object:", error);
      throw new Error(`Failed to delete object: ${error instanceof Error ? error.message : 'Unknown error'}`);
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