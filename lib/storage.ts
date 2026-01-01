import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// S3/R2 Client Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: process.env.AWS_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "";

// Public URL base (for Cloudflare R2 public access)
function getPublicUrl(objectKey: string): string {
  // If using R2 with public access
  if (process.env.AWS_S3_PUBLIC_URL) {
    return `${process.env.AWS_S3_PUBLIC_URL}/${objectKey}`;
  }
  // Fallback to endpoint-based URL
  const endpoint = process.env.AWS_S3_ENDPOINT || "";
  return `${endpoint}/${BUCKET_NAME}/${objectKey}`;
}

/**
 * Generate a presigned URL for uploading a file
 */
export async function generateUploadUrl(
  contentType: string,
  fileName: string,
): Promise<{ uploadUrl: string; objectKey: string; publicUrl: string }> {
  // Generate a unique object key
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString("hex");
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const objectKey = `uploads/${timestamp}-${randomId}-${sanitizedFileName}`;

  // Create the presigned URL
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const publicUrl = getPublicUrl(objectKey);

  return { uploadUrl, objectKey, publicUrl };
}

/**
 * Upload a file directly (for server-side uploads)
 */
export async function uploadFile(
  fileData: Buffer,
  contentType: string,
  fileName: string,
): Promise<{ objectKey: string; publicUrl: string }> {
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString("hex");
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const objectKey = `uploads/${timestamp}-${randomId}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    Body: fileData,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  await s3Client.send(command);
  const publicUrl = getPublicUrl(objectKey);

  return { objectKey, publicUrl };
}

/**
 * Generate a presigned URL for reading a file
 */
export async function generateReadUrl(objectKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export { s3Client, BUCKET_NAME };
