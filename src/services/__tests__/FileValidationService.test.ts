import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileValidationService } from '../FileValidationService';

describe('FileValidationService', () => {
  let service: FileValidationService;

  beforeEach(() => {
    service = FileValidationService.getInstance();
  });

  describe('validateFileMetadata', () => {
    it('validates valid image file', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await service.validateFileMetadata(file, 'image');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects oversized file', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const result = await service.validateFileMetadata(largeFile, 'image');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum allowed size');
    });

    it('rejects invalid MIME type', async () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      const result = await service.validateFileMetadata(file, 'image');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid file type');
    });
  });

  describe('validateImageDimensions', () => {
    it('validates image within dimensions', async () => {
      // Mock Image and URL
      const originalImage = window.Image;
      const originalURL = window.URL;

      class MockImage {
        width = 800;
        height = 600;
        onload: () => void = () => {};

        constructor() {
          setTimeout(() => this.onload(), 0);
        }
      }

      window.Image = MockImage as any;
      window.URL.createObjectURL = vi.fn(() => 'mock-url');
      window.URL.revokeObjectURL = vi.fn();

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await service.validateImageDimensions(file);

      expect(result.isValid).toBe(true);
      expect(result.dimensions).toEqual({ width: 800, height: 600 });

      // Restore mocks
      window.Image = originalImage;
      window.URL = originalURL;
    });

    it('rejects oversized image', async () => {
      // Mock Image and URL
      const originalImage = window.Image;
      const originalURL = window.URL;

      class MockImage {
        width = 5000;
        height = 5000;
        onload: () => void = () => {};

        constructor() {
          setTimeout(() => this.onload(), 0);
        }
      }

      window.Image = MockImage as any;
      window.URL.createObjectURL = vi.fn(() => 'mock-url');
      window.URL.revokeObjectURL = vi.fn();

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await service.validateImageDimensions(file);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceed maximum allowed');

      // Restore mocks
      window.Image = originalImage;
      window.URL = originalURL;
    });
  });

  describe('validateVideoMetadata', () => {
    it('validates video within limits', async () => {
      // Mock video element
      const originalCreateElement = document.createElement;
      const mockVideo = {
        duration: 120,
        videoWidth: 1280,
        videoHeight: 720,
        onloadedmetadata: () => {},
        src: ''
      };

      document.createElement = vi.fn(() => mockVideo) as any;
      window.URL.createObjectURL = vi.fn(() => 'mock-url');
      window.URL.revokeObjectURL = vi.fn();

      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      
      // Trigger metadata load
      setTimeout(() => mockVideo.onloadedmetadata(), 0);
      
      const result = await service.validateVideoMetadata(file);

      expect(result.isValid).toBe(true);
      expect(result.metadata).toEqual({
        duration: 120,
        width: 1280,
        height: 720
      });

      // Restore mock
      document.createElement = originalCreateElement;
    });

    it('rejects long video', async () => {
      // Mock video element
      const originalCreateElement = document.createElement;
      const mockVideo = {
        duration: 600, // 10 minutes
        videoWidth: 1280,
        videoHeight: 720,
        onloadedmetadata: () => {},
        src: ''
      };

      document.createElement = vi.fn(() => mockVideo) as any;
      window.URL.createObjectURL = vi.fn(() => 'mock-url');
      window.URL.revokeObjectURL = vi.fn();

      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      
      // Trigger metadata load
      setTimeout(() => mockVideo.onloadedmetadata(), 0);
      
      const result = await service.validateVideoMetadata(file);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum allowed');

      // Restore mock
      document.createElement = originalCreateElement;
    });
  });

  describe('validateDocumentContent', () => {
    it('validates safe document', async () => {
      const file = new File(['# Safe markdown\n\nNormal text'], 'test.md', { type: 'text/markdown' });
      const result = await service.validateDocumentContent(file);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects malicious content', async () => {
      const file = new File(['<script>alert("xss")</script>'], 'test.md', { type: 'text/markdown' });
      const result = await service.validateDocumentContent(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('malicious content');
    });
  });

  describe('validateFile', () => {
    it('performs comprehensive validation', async () => {
      // Mock Image for dimension check
      const originalImage = window.Image;
      class MockImage {
        width = 800;
        height = 600;
        onload: () => void = () => {};
        constructor() {
          setTimeout(() => this.onload(), 0);
        }
      }
      window.Image = MockImage as any;

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await service.validateFile(file, 'image');

      expect(result.isValid).toBe(true);
      expect(result.metadata?.dimensions).toEqual({ width: 800, height: 600 });

      // Restore mock
      window.Image = originalImage;
    });

    it('handles validation errors', async () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      const result = await service.validateFile(file, 'image');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });
}); 