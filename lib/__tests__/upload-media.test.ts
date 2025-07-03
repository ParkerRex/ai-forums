import { describe, it, expect } from 'vitest';
import { validateMediaFile } from '../upload-media';

describe('validateMediaFile', () => {
  describe('image files', () => {
    it('should accept valid image files under 10MB', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // 5MB
      
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject image files over 10MB', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 }); // 11MB
      
      const result = validateMediaFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Image file must be less than 10MB');
    });
  });

  describe('video files', () => {
    it('should accept valid video files under 100MB', () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 }); // 50MB
      
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject video files over 100MB', () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 }); // 101MB
      
      const result = validateMediaFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Video file must be less than 100MB');
    });
  });

  describe('PDF files', () => {
    it('should accept valid PDF files under 20MB', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject PDF files over 20MB', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 }); // 21MB
      
      const result = validateMediaFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('PDF file must be less than 20MB');
    });
  });

  describe('Word document files', () => {
    it('should accept .doc files under 20MB', () => {
      const file = new File(['test'], 'test.doc', { type: 'application/msword' });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept .docx files under 20MB', () => {
      const file = new File(['test'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateMediaFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject .doc files over 20MB', () => {
      const file = new File(['test'], 'test.doc', { type: 'application/msword' });
      Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 }); // 21MB
      
      const result = validateMediaFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Word document must be less than 20MB');
    });

    it('should reject .docx files over 20MB', () => {
      const file = new File(['test'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 }); // 21MB
      
      const result = validateMediaFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Word document must be less than 20MB');
    });
  });

  describe('unsupported file types', () => {
    it('should reject unsupported file types', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 1024 }); // 1KB
      
      const result = validateMediaFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type not supported. Please upload an image, video, PDF, or Word document.');
    });
  });
});