import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from '../_generated/api';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://mock-signed-url.com'),
}));

describe('storage actions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock environment variables
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY = 'test-key';
    process.env.R2_SECRET_KEY = 'test-secret';
    process.env.R2_BUCKET = 'test-bucket';
    process.env.R2_PUBLIC_URL = 'https://test.r2.dev';
    
    // Set default S3Client mock
    const { S3Client } = await import('@aws-sdk/client-s3');
    (S3Client as any).mockReturnValue({ send: vi.fn().mockResolvedValue({}) });
  });

  describe('generateUploadUrl', () => {
    it('validates content type', async () => {
      const t = convexTest();
      
      // Test invalid content type
      await expect(
        t.action(api.storage.generateUploadUrl, {
          contentType: 'application/pdf',
          fileName: 'test.pdf',
        })
      ).rejects.toThrow('Invalid image type');
    });

    it('validates file extension', async () => {
      const t = convexTest();
      
      // Test invalid extension
      await expect(
        t.action(api.storage.generateUploadUrl, {
          contentType: 'image/jpeg',
          fileName: 'test.txt',
        })
      ).rejects.toThrow('Invalid file extension');
    });

    it('generates valid upload URL for valid input', async () => {
      const t = convexTest();
      
      const result = await t.action(api.storage.generateUploadUrl, {
        contentType: 'image/jpeg',
        fileName: 'test.jpg',
      });
      
      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('objectKey');
      expect(result).toHaveProperty('publicUrl');
      expect(result.objectKey).toMatch(/^uploads\/\d+-\w+\.jpg$/);
      expect(result.publicUrl).toContain('test.r2.dev');
    });

    it('handles missing R2 configuration', async () => {
      delete process.env.R2_BUCKET;
      
      const t = convexTest();
      
      await expect(
        t.action(api.storage.generateUploadUrl, {
          contentType: 'image/jpeg',
          fileName: 'test.jpg',
        })
      ).rejects.toThrow('R2_BUCKET environment variable is not set');
    });
  });

  describe('deleteObject', () => {
    it('validates object key format', async () => {
      const t = convexTest();
      
      const result = await t.action(api.storage.deleteObject, {
        objectKey: 'invalid/path/file.jpg',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid object key');
    });

    it('handles missing bucket configuration gracefully', async () => {
      delete process.env.R2_BUCKET;
      
      const t = convexTest();
      
      const result = await t.action(api.storage.deleteObject, {
        objectKey: 'uploads/test.jpg',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage not configured');
    });

    it('returns success for already deleted objects', async () => {
      const t = convexTest();
      
      // Mock S3 client to throw NoSuchKey error
      const { S3Client } = await import('@aws-sdk/client-s3');
      const mockSend = vi.fn().mockRejectedValue(
        Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey' })
      );
      (S3Client as any).mockReturnValue({ send: mockSend });
      
      const result = await t.action(api.storage.deleteObject, {
        objectKey: 'uploads/test.jpg',
      });
      
      expect(result.success).toBe(true);
      expect(result.note).toBe('Object already deleted');
    });
  });

  describe('uploadFile', () => {
    it('validates content type', async () => {
      const t = convexTest();
      
      await expect(
        t.action(api.storage.uploadFile, {
          fileData: 'base64data',
          contentType: 'text/plain',
          fileName: 'test.txt',
        })
      ).rejects.toThrow('Invalid image type');
    });

    it('handles base64 file upload', async () => {
      const t = convexTest();
      
      // Mock successful S3 upload
      const { S3Client } = await import('@aws-sdk/client-s3');
      const mockSend = vi.fn().mockResolvedValue({});
      (S3Client as any).mockReturnValue({ send: mockSend });
      
      const result = await t.action(api.storage.uploadFile, {
        fileData: Buffer.from('test image data').toString('base64'),
        contentType: 'image/jpeg',
        fileName: 'test.jpg',
      });
      
      expect(result).toHaveProperty('objectKey');
      expect(result).toHaveProperty('publicUrl');
      expect(result.objectKey).toMatch(/^uploads\/\d+-\w+\.jpg$/);
    });
  });

  describe('testR2Connection', () => {
    it('reports successful connection', async () => {
      const t = convexTest();
      
      const result = await t.action(api.storage.testR2Connection, {});
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('R2 connection successful');
      expect(result.bucket).toBe('test-bucket');
    });

    it('reports connection failure', async () => {
      const t = convexTest();
      
      // Mock S3Client to throw error
      const { S3Client } = await import('@aws-sdk/client-s3');
      (S3Client as any).mockImplementation(() => {
        throw new Error('Invalid credentials');
      });
      
      const result = await t.action(api.storage.testR2Connection, {});
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid credentials');
    });
  });
});