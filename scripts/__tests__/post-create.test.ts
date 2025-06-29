import { describe, it, expect } from 'vitest';
import { validateMediaFile } from '@/lib/upload-media';

describe('Post Creation', () => {
  describe('validateMediaFile', () => {
    it('should accept valid image files', () => {
      const validImageFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(validImageFile, 'size', { value: 5 * 1024 * 1024 }); // 5MB
      
      const result = validateMediaFile(validImageFile);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject oversized image files', () => {
      const oversizedImageFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(oversizedImageFile, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateMediaFile(oversizedImageFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Image file must be less than 10MB');
    });

    it('should accept valid video files', () => {
      const validVideoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(validVideoFile, 'size', { value: 50 * 1024 * 1024 }); // 50MB
      
      const result = validateMediaFile(validVideoFile);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject oversized video files', () => {
      const oversizedVideoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(oversizedVideoFile, 'size', { value: 150 * 1024 * 1024 }); // 150MB
      
      const result = validateMediaFile(oversizedVideoFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Video file must be less than 100MB');
    });

    it('should reject unsupported file types', () => {
      const unsupportedFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(unsupportedFile, 'size', { value: 1 * 1024 * 1024 }); // 1MB
      
      const result = validateMediaFile(unsupportedFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type not supported. Please upload an image or video.');
    });

    it('should accept all supported image types', () => {
      const imageTypes = [
        { type: 'image/jpeg', ext: 'jpg' },
        { type: 'image/png', ext: 'png' },
        { type: 'image/gif', ext: 'gif' },
        { type: 'image/webp', ext: 'webp' },
      ];

      imageTypes.forEach(({ type, ext }) => {
        const file = new File([''], `test.${ext}`, { type });
        Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }); // 1MB
        
        const result = validateMediaFile(file);
        expect(result.valid).toBe(true);
      });
    });

    it('should accept all supported video types', () => {
      const videoTypes = [
        { type: 'video/mp4', ext: 'mp4' },
        { type: 'video/webm', ext: 'webm' },
        { type: 'video/quicktime', ext: 'mov' },
      ];

      videoTypes.forEach(({ type, ext }) => {
        const file = new File([''], `test.${ext}`, { type });
        Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 }); // 10MB
        
        const result = validateMediaFile(file);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Post Type Validation', () => {
    // Mock mutation validator logic
    interface PostData {
      type: string;
      title: string;
      content: string;
      categoryId: string;
      mediaUrl?: string;
      linkUrl?: string;
    }

    const validatePostData = (data: PostData) => {
      const { type, mediaUrl, linkUrl } = data;
      
      if (type === 'image' && !mediaUrl) {
        throw new Error('Image posts require a media URL');
      }
      if (type === 'video' && !mediaUrl) {
        throw new Error('Video posts require a media URL');
      }
      if (type === 'link' && !linkUrl) {
        throw new Error('Link posts require a link URL');
      }
      
      return true;
    };

    it('should validate text posts', () => {
      const textPost: PostData = {
        type: 'text',
        title: 'Test Post',
        content: 'This is a test post',
        categoryId: 'category123',
      };

      expect(() => validatePostData(textPost)).not.toThrow();
    });

    it('should require mediaUrl for image posts', () => {
      const imagePostWithoutMedia: PostData = {
        type: 'image',
        title: 'Image Post',
        content: 'Description',
        categoryId: 'category123',
      };

      expect(() => validatePostData(imagePostWithoutMedia))
        .toThrow('Image posts require a media URL');

      const imagePostWithMedia: PostData = {
        ...imagePostWithoutMedia,
        mediaUrl: 'https://example.com/image.jpg',
      };

      expect(() => validatePostData(imagePostWithMedia)).not.toThrow();
    });

    it('should require mediaUrl for video posts', () => {
      const videoPostWithoutMedia: PostData = {
        type: 'video',
        title: 'Video Post',
        content: 'Description',
        categoryId: 'category123',
      };

      expect(() => validatePostData(videoPostWithoutMedia))
        .toThrow('Video posts require a media URL');

      const videoPostWithMedia: PostData = {
        ...videoPostWithoutMedia,
        mediaUrl: 'https://example.com/video.mp4',
      };

      expect(() => validatePostData(videoPostWithMedia)).not.toThrow();
    });

    it('should require linkUrl for link posts', () => {
      const linkPostWithoutUrl: PostData = {
        type: 'link',
        title: 'Link Post',
        content: 'Check out this link',
        categoryId: 'category123',
      };

      expect(() => validatePostData(linkPostWithoutUrl))
        .toThrow('Link posts require a link URL');

      const linkPostWithUrl: PostData = {
        ...linkPostWithoutUrl,
        linkUrl: 'https://example.com',
      };

      expect(() => validatePostData(linkPostWithUrl)).not.toThrow();
    });
  });
}); 