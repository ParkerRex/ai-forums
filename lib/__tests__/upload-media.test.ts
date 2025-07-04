import { describe, it, expect } from 'vitest';
import { validateMediaFile, validateDocumentFile, extractVideoThumbnail } from '../upload-media';

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

// Note: extractVideoThumbnail tests require DOM APIs (HTMLVideoElement, HTMLCanvasElement)
// These tests would need to run in a browser environment or with jsdom configured
// For now, we'll create a basic test that verifies the function exists
describe('extractVideoThumbnail', () => {
  it('should be a function', () => {
    expect(typeof extractVideoThumbnail).toBe('function');
  });

  // The following tests are commented out as they require DOM APIs
  // They can be enabled when running in a browser environment or with proper jsdom setup
  /*
  let mockVideo: any;
  let mockCanvas: any;
  let mockContext: any;
  let createElementSpy: ReturnType<typeof vi.spyOn> | undefined;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn> | undefined;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    // Mock canvas context
    mockContext = {
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    // Mock canvas
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext),
      toBlob: vi.fn((callback) => {
        const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
        callback(blob);
      }),
    } as unknown as HTMLCanvasElement;

    // Mock video element
    mockVideo = {
      addEventListener: vi.fn(),
      load: vi.fn(),
      videoWidth: 1920,
      videoHeight: 1080,
      duration: 10,
      currentTime: 0,
      src: '',
    } as unknown as HTMLVideoElement;

    // Mock document.createElement
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') return mockVideo;
      if (tagName === 'canvas') return mockCanvas;
      return document.createElement(tagName);
    });

    // Mock URL methods
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Mock FileReader
    global.FileReader = vi.fn().mockImplementation(() => ({
      readAsDataURL: vi.fn(function(this: FileReader) {
        setTimeout(() => {
          Object.defineProperty(this, 'result', { value: 'data:image/jpeg;base64,fake-base64-data' });
          this.onloadend?.({} as ProgressEvent<FileReader>);
        }, 0);
      }),
    })) as any;
  });

  afterEach(() => {
    createElementSpy?.mockRestore();
    createObjectURLSpy?.mockRestore();
    revokeObjectURLSpy?.mockRestore();
    vi.clearAllMocks();
  });

  it('should extract thumbnail from video file', async () => {
    const videoFile = new File(['video-content'], 'test.mp4', { type: 'video/mp4' });

    // Set up event listeners
    mockVideo.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (event === 'loadedmetadata') {
        // Simulate metadata loaded
        setTimeout(() => {
          handler({} as Event);
          // Check that currentTime was set
          expect(mockVideo.currentTime).toBe(1); // Should seek to 1 second
        }, 0);
      } else if (event === 'seeked') {
        // Simulate seek completed
        setTimeout(() => {
          handler({} as Event);
        }, 0);
      }
    });

    const result = await extractVideoThumbnail(videoFile);

    expect(result).toBe('data:image/jpeg;base64,fake-base64-data');
    expect(createObjectURLSpy).toHaveBeenCalledWith(videoFile);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    expect(mockContext.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 1920, 1080);
  });

  it('should seek to 10% of duration for short videos', async () => {
    const videoFile = new File(['video-content'], 'test.mp4', { type: 'video/mp4' });
    
    // Mock a short video (5 seconds)
    mockVideo.duration = 5;

    mockVideo.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (event === 'loadedmetadata') {
        setTimeout(() => {
          handler({} as Event);
          // Should seek to 10% of 5 seconds = 0.5 seconds
          expect(mockVideo.currentTime).toBe(0.5);
        }, 0);
      } else if (event === 'seeked') {
        setTimeout(() => {
          handler({} as Event);
        }, 0);
      }
    });

    await extractVideoThumbnail(videoFile);
  });

  it('should handle video loading errors', async () => {
    const videoFile = new File(['video-content'], 'test.mp4', { type: 'video/mp4' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockVideo.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (event === 'error') {
        setTimeout(() => {
          handler({} as Event);
        }, 0);
      }
    });

    const result = await extractVideoThumbnail(videoFile);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Error loading video for thumbnail extraction');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

    consoleSpy.mockRestore();
  });

  it('should handle missing canvas context', async () => {
    const videoFile = new File(['video-content'], 'test.mp4', { type: 'video/mp4' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock canvas without context
    mockCanvas.getContext = vi.fn(() => null);

    const result = await extractVideoThumbnail(videoFile);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Could not get canvas context');

    consoleSpy.mockRestore();
  });

  it('should handle canvas toBlob failure', async () => {
    const videoFile = new File(['video-content'], 'test.mp4', { type: 'video/mp4' });

    // Mock canvas toBlob to return null
    mockCanvas.toBlob = vi.fn((callback) => {
      callback(null);
    });

    mockVideo.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (event === 'loadedmetadata') {
        setTimeout(() => {
          handler({} as Event);
        }, 0);
      } else if (event === 'seeked') {
        setTimeout(() => {
          handler({} as Event);
        }, 0);
      }
    });

    const result = await extractVideoThumbnail(videoFile);

    expect(result).toBeNull();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should set canvas dimensions to match video', async () => {
    const videoFile = new File(['video-content'], 'test.mp4', { type: 'video/mp4' });
    
    mockVideo.videoWidth = 1280;
    mockVideo.videoHeight = 720;

    mockVideo.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (event === 'loadedmetadata') {
        setTimeout(() => {
          handler({} as Event);
          expect(mockCanvas.width).toBe(1280);
          expect(mockCanvas.height).toBe(720);
        }, 0);
      } else if (event === 'seeked') {
        setTimeout(() => {
          handler({} as Event);
        }, 0);
      }
    });

    await extractVideoThumbnail(videoFile);
  });

  it('should use JPEG format with 0.8 quality', async () => {
    const videoFile = new File(['video-content'], 'test.mp4', { type: 'video/mp4' });
    let toBlobArgs: any[] = [];

    mockCanvas.toBlob = vi.fn((callback, type, quality) => {
      toBlobArgs = [type, quality];
      const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
      callback(blob);
    });

    mockVideo.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (event === 'loadedmetadata') {
        setTimeout(() => {
          handler({} as Event);
        }, 0);
      } else if (event === 'seeked') {
        setTimeout(() => {
          handler({} as Event);
        }, 0);
      }
    });

    await extractVideoThumbnail(videoFile);

    expect(toBlobArgs[0]).toBe('image/jpeg');
    expect(toBlobArgs[1]).toBe(0.8);
  });
  */
});