import { describe, it, expect } from 'vitest';
import { Id } from '@/convex/_generated/dataModel';
import {
  getPostPreviewAsset,
  getContentExcerpt,
  formatPostStats,
  getPreviewDimensions,
  hasMedia,
  isLinkPost,
  getPostTypeLabel,
  shouldAutoplay,
  type PostData
} from '@/lib/post-preview-utils';

describe('Post Preview Utils', () => {
  const mockTextPost: PostData = {
    _id: 'post1' as Id<"posts">,
    title: 'Test Post',
    content: 'This is a test post content',
    type: 'text',
    createdAt: Date.now(),
    upvotes: 10,
    downvotes: 2,
    commentCount: 5,
    viewCount: 100,
  };

  const mockImagePost: PostData = {
    ...mockTextPost,
    _id: 'post2' as Id<"posts">,
    type: 'image',
    mediaUrl: 'https://example.com/image.jpg',
    thumbnailUrl: 'https://example.com/image-thumb.jpg',
  };

  const mockVideoPost: PostData = {
    ...mockTextPost,
    _id: 'post3' as Id<"posts">,
    type: 'video',
    mediaUrl: 'https://example.com/video.mp4',
    thumbnailUrl: 'https://example.com/video-thumb.jpg',
  };

  const mockLinkPost: PostData = {
    ...mockTextPost,
    _id: 'post4' as Id<"posts">,
    type: 'link',
    linkUrl: 'https://example.com',
    linkTitle: 'Example Website',
    linkDescription: 'This is an example website',
    linkImage: 'https://example.com/og-image.jpg',
  };

  describe('getPostPreviewAsset', () => {
    it('should return text type for text posts', () => {
      const result = getPostPreviewAsset(mockTextPost);
      expect(result).toEqual({ type: 'text' });
    });

    it('should return image data for image posts', () => {
      const result = getPostPreviewAsset(mockImagePost);
      expect(result).toEqual({
        type: 'image',
        url: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/image-thumb.jpg',
      });
    });

    it('should use mediaUrl as thumbnail if thumbnailUrl is not provided', () => {
      const postWithoutThumb = { ...mockImagePost, thumbnailUrl: undefined };
      const result = getPostPreviewAsset(postWithoutThumb);
      expect(result.thumbnailUrl).toBe('https://example.com/image.jpg');
    });

    it('should return video data for video posts', () => {
      const result = getPostPreviewAsset(mockVideoPost);
      expect(result).toEqual({
        type: 'video',
        url: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/video-thumb.jpg',
      });
    });

    it('should return link data for link posts', () => {
      const result = getPostPreviewAsset(mockLinkPost);
      expect(result).toEqual({
        type: 'link',
        url: 'https://example.com',
        thumbnailUrl: 'https://example.com/og-image.jpg',
        title: 'Example Website',
        description: 'This is an example website',
      });
    });

    it('should default to text type if type is not specified', () => {
      const postWithoutType = { ...mockTextPost, type: undefined };
      const result = getPostPreviewAsset(postWithoutType);
      expect(result.type).toBe('text');
    });
  });

  describe('getContentExcerpt', () => {
    it('should return full content if shorter than maxLength', () => {
      const shortContent = 'This is short';
      const result = getContentExcerpt(shortContent);
      expect(result).toBe('This is short');
    });

    it('should truncate long content at word boundary', () => {
      const longContent = 'This is a very long content that should be truncated at a word boundary to avoid cutting words in the middle of them which would look bad';
      const result = getContentExcerpt(longContent, 50);
      expect(result).toBe('This is a very long content that should be...');
    });

    it('should strip HTML tags', () => {
      const htmlContent = '<p>This is <strong>HTML</strong> content</p>';
      const result = getContentExcerpt(htmlContent);
      expect(result).toBe('This is HTML content');
    });

    it('should handle content without spaces', () => {
      const noSpaces = 'a'.repeat(200);
      const result = getContentExcerpt(noSpaces, 50);
      expect(result).toBe('a'.repeat(50) + '...');
    });
  });

  describe('formatPostStats', () => {
    it('should format stats correctly', () => {
      const result = formatPostStats(mockTextPost);
      expect(result).toEqual({
        votes: '8', // 10 - 2
        comments: '5',
        views: '100',
        score: 8,
      });
    });

    it('should format thousands with k suffix', () => {
      const post = {
        ...mockTextPost,
        upvotes: 5500,
        downvotes: 500,
        commentCount: 1200,
        viewCount: 15000,
      };
      const result = formatPostStats(post);
      expect(result).toEqual({
        votes: '5k',
        comments: '1.2k',
        views: '15k',
        score: 5000,
      });
    });

    it('should format millions with M suffix', () => {
      const post = {
        ...mockTextPost,
        upvotes: 2500000,
        downvotes: 500000,
        viewCount: 1500000,
      };
      const result = formatPostStats(post);
      expect(result).toEqual({
        votes: '2M',
        comments: '5',
        views: '1.5M',
        score: 2000000,
      });
    });

    it('should handle negative votes', () => {
      const post = {
        ...mockTextPost,
        upvotes: 2,
        downvotes: 10,
      };
      const result = formatPostStats(post);
      expect(result.votes).toBe('-8');
      expect(result.score).toBe(-8);
    });
  });

  describe('getPreviewDimensions', () => {
    it('should return small dimensions', () => {
      const result = getPreviewDimensions('small');
      expect(result).toEqual({
        maxWidth: '100px',
        maxHeight: '75px',
        thumbnailSize: 'w-24 h-18',
      });
    });

    it('should return medium dimensions', () => {
      const result = getPreviewDimensions('medium');
      expect(result).toEqual({
        maxWidth: '200px',
        maxHeight: '150px',
        thumbnailSize: 'w-48 h-36',
      });
    });

    it('should return large dimensions', () => {
      const result = getPreviewDimensions('large');
      expect(result).toEqual({
        maxWidth: '100%',
        maxHeight: '400px',
        thumbnailSize: 'w-full h-96',
      });
    });
  });

  describe('hasMedia', () => {
    it('should return true for image posts', () => {
      expect(hasMedia(mockImagePost)).toBe(true);
    });

    it('should return true for video posts', () => {
      expect(hasMedia(mockVideoPost)).toBe(true);
    });

    it('should return false for text posts', () => {
      expect(hasMedia(mockTextPost)).toBe(false);
    });

    it('should return false for link posts', () => {
      expect(hasMedia(mockLinkPost)).toBe(false);
    });
  });

  describe('isLinkPost', () => {
    it('should return true for link posts', () => {
      expect(isLinkPost(mockLinkPost)).toBe(true);
    });

    it('should return false for other post types', () => {
      expect(isLinkPost(mockTextPost)).toBe(false);
      expect(isLinkPost(mockImagePost)).toBe(false);
      expect(isLinkPost(mockVideoPost)).toBe(false);
    });
  });

  describe('getPostTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getPostTypeLabel(mockTextPost)).toBe('Text');
      expect(getPostTypeLabel(mockImagePost)).toBe('Image');
      expect(getPostTypeLabel(mockVideoPost)).toBe('Video');
      expect(getPostTypeLabel(mockLinkPost)).toBe('Link');
    });

    it('should default to Text for undefined type', () => {
      const postWithoutType = { ...mockTextPost, type: undefined };
      expect(getPostTypeLabel(postWithoutType)).toBe('Text');
    });
  });

  describe('shouldAutoplay', () => {
    it('should return false for non-video posts', () => {
      expect(shouldAutoplay(mockTextPost)).toBe(false);
      expect(shouldAutoplay(mockImagePost)).toBe(false);
      expect(shouldAutoplay(mockLinkPost)).toBe(false);
    });

    it('should return true for video posts with user preference', () => {
      expect(shouldAutoplay(mockVideoPost, true)).toBe(true);
    });

    it('should return false for video posts without user preference', () => {
      expect(shouldAutoplay(mockVideoPost, false)).toBe(false);
    });
  });
}); 