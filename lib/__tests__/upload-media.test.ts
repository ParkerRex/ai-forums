import { describe, it, expect } from 'vitest';
import { validateMediaFile, validateDocumentFile } from '../upload-media';

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

describe('validateDocumentFile', () => {
  describe('PDF files', () => {
    it('should accept valid PDF files under 20MB', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject PDF files over 20MB', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 25 * 1024 * 1024 }); // 25MB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Document must be less than 20MB');
    });
  });

  describe('Word document files', () => {
    it('should accept .doc files under 20MB', () => {
      const file = new File(['test'], 'test.doc', { type: 'application/msword' });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept .docx files under 20MB', () => {
      const file = new File(['test'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('text files', () => {
    it('should accept .txt files under 20MB', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 1024 }); // 1KB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept .md files under 20MB', () => {
      const file = new File(['test'], 'test.md', { type: 'text/markdown' });
      Object.defineProperty(file, 'size', { value: 1024 }); // 1KB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('PowerPoint files', () => {
    it('should accept .ppt files under 20MB', () => {
      const file = new File(['test'], 'test.ppt', { type: 'application/vnd.ms-powerpoint' });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept .pptx files under 20MB', () => {
      const file = new File(['test'], 'test.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Excel files', () => {
    it('should accept .xls files under 20MB', () => {
      const file = new File(['test'], 'test.xls', { type: 'application/vnd.ms-excel' });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept .xlsx files under 20MB', () => {
      const file = new File(['test'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept .csv files under 20MB', () => {
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      Object.defineProperty(file, 'size', { value: 1024 }); // 1KB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('unsupported file types', () => {
    it('should reject image files', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 }); // 1KB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type not supported. Please upload PDF, Word, PowerPoint, Excel, text, or markdown documents.');
    });

    it('should reject video files', () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(file, 'size', { value: 1024 }); // 1KB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type not supported. Please upload PDF, Word, PowerPoint, Excel, text, or markdown documents.');
    });

    it('should reject other unsupported file types', () => {
      const file = new File(['test'], 'test.exe', { type: 'application/octet-stream' });
      Object.defineProperty(file, 'size', { value: 1024 }); // 1KB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type not supported. Please upload PDF, Word, PowerPoint, Excel, text, or markdown documents.');
    });
  });

  describe('file size limits', () => {
    it('should reject documents over 20MB', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 25 * 1024 * 1024 }); // 25MB
      
      const result = validateDocumentFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Document must be less than 20MB');
    });
  });
});