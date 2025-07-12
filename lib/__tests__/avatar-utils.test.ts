import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAvatarUrl,
  extractObjectKey,
  getInitials,
  isAvatarAccessible,
  validateAvatarFile,
} from '../avatar-utils';

// Mock fetch for accessibility tests
global.fetch = vi.fn();

describe('avatar-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getAvatarUrl', () => {
    it('returns undefined for empty input', () => {
      expect(getAvatarUrl()).toBeUndefined();
      expect(getAvatarUrl(null)).toBeUndefined();
      expect(getAvatarUrl('')).toBeUndefined();
    });

    it('validates URL format', () => {
      expect(getAvatarUrl('invalid-url')).toBeUndefined();
      expect(console.warn).toHaveBeenCalledWith('Invalid avatar URL format: invalid-url');
    });

    it('returns valid URLs without modification when no size specified', () => {
      const httpsUrl = 'https://example.com/avatar.jpg';
      const httpUrl = 'http://example.com/avatar.jpg';
      
      expect(getAvatarUrl(httpsUrl)).toBe(httpsUrl);
      expect(getAvatarUrl(httpUrl)).toBe(httpUrl);
    });

    it('adds Cloudflare image resizing for R2 URLs', () => {
      const r2Url = 'https://account.r2.cloudflarestorage.com/bucket/uploads/123.jpg';
      const result = getAvatarUrl(r2Url, 128);
      
      expect(result).toContain('cdn-cgi/image');
      expect(result).toContain('width=128');
      expect(result).toContain('height=128');
      expect(result).toContain('fit=cover');
      expect(result).toContain('format=webp');
    });

    it('handles malformed URLs gracefully', () => {
      const malformedUrl = 'https://[invalid';
      const result = getAvatarUrl(malformedUrl, 128);
      
      expect(result).toBe(malformedUrl);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('extractObjectKey', () => {
    it('returns null for invalid inputs', () => {
      expect(extractObjectKey('')).toBeNull();
      expect(extractObjectKey('https://example.com/image.jpg')).toBeNull();
    });

    it('extracts object key from R2 URLs', () => {
      const url = 'https://account.r2.cloudflarestorage.com/bucket/uploads/123-abc.jpg';
      expect(extractObjectKey(url)).toBe('uploads/123-abc.jpg');
    });

    it('handles URLs with query parameters', () => {
      const url = 'https://example.com/uploads/file.jpg?signature=xyz';
      expect(extractObjectKey(url)).toBe('uploads/file.jpg?signature=xyz');
    });
  });

  describe('getInitials', () => {
    it('generates correct initials', () => {
      expect(getInitials('John', 'Doe')).toBe('JD');
      expect(getInitials('alice', 'smith')).toBe('AS');
      expect(getInitials('X', 'Y')).toBe('XY');
    });

    it('handles empty strings', () => {
      expect(getInitials('', '')).toBe('');
      expect(getInitials('John', '')).toBe('J');
      expect(getInitials('', 'Doe')).toBe('D');
    });

    it('handles special characters', () => {
      expect(getInitials('José', 'García')).toBe('JG');
      expect(getInitials('李', '王')).toBe('李王');
    });
  });

  describe('isAvatarAccessible', () => {
    it('returns false for empty URL', async () => {
      expect(await isAvatarAccessible('')).toBe(false);
    });

    it('returns true for successful fetch', async () => {
      (global.fetch as any).mockResolvedValueOnce({});
      
      const result = await isAvatarAccessible('https://example.com/avatar.jpg');
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/avatar.jpg',
        { method: 'HEAD', mode: 'no-cors' }
      );
    });

    it('returns false and logs warning on fetch error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      const result = await isAvatarAccessible('https://example.com/avatar.jpg');
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'Avatar accessibility check failed:',
        expect.any(Error)
      );
    });
  });

  describe('validateAvatarFile', () => {
    it('validates file type', () => {
      const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(validateAvatarFile(validFile)).toBeNull();

      const invalidFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      expect(validateAvatarFile(invalidFile)).toBe(
        'Invalid file type. Please use JPEG, PNG, or WebP.'
      );
    });

    it('validates file size', () => {
      const smallFile = new File(['x'.repeat(1024 * 1024)], 'test.jpg', { 
        type: 'image/jpeg' 
      });
      expect(validateAvatarFile(smallFile)).toBeNull();

      // Create a mock large file
      const largeFile = new File([], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });
      
      expect(validateAvatarFile(largeFile)).toBe(
        'File too large. Maximum size is 5MB.'
      );
    });

    it('accepts all valid image types', () => {
      const types = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ];

      types.forEach(type => {
        const file = new File([''], 'test', { type });
        expect(validateAvatarFile(file)).toBeNull();
      });
    });

    it('handles case-insensitive MIME types', () => {
      const file = new File([''], 'test.jpg', { type: 'IMAGE/JPEG' });
      expect(validateAvatarFile(file)).toBeNull();
    });
  });
});