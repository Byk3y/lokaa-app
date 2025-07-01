/**
 * File Validation Service
 * 
 * Provides comprehensive file validation with:
 * - MIME type validation
 * - Size limits
 * - Content validation
 * - Security scanning
 */

import { z } from 'zod';
import { MobileValidationService } from './MobileValidationService';

// File type configurations
const FILE_CONFIGS = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxDimensions: {
      width: 4096,
      height: 4096
    }
  },
  video: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxDuration: 300 // 5 minutes
  },
  document: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ]
  }
} as const;

// Validation schemas
const dimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive()
});

const fileMetadataSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().positive(),
  type: z.string(),
  lastModified: z.number()
});

// Internal helper for dimension checks - exported for testing
export const validateImageDimensionsInternal = (file: File): Promise<{
  isValid: boolean;
  errors: string[];
  dimensions?: { width: number; height: number };
}> => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      const validation = dimensionsSchema.safeParse({
        width: img.width,
        height: img.height
      });

      if (!validation.success) {
        resolve({
          isValid: false,
          errors: validation.error.errors.map(e => e.message)
        });
        return;
      }

      const config = FILE_CONFIGS.image;
      if (img.width > config.maxDimensions.width || 
          img.height > config.maxDimensions.height) {
        resolve({
          isValid: false,
          errors: [`Image dimensions exceed maximum allowed (${config.maxDimensions.width}x${config.maxDimensions.height})`],
          dimensions: { width: img.width, height: img.height }
        });
        return;
      }

      resolve({
        isValid: true,
        errors: [],
        dimensions: { width: img.width, height: img.height }
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        isValid: false,
        errors: ['Failed to load image']
      });
    };

    img.src = objectUrl;
  });
};

export class FileValidationService {
  private static instance: FileValidationService;
  private mobileValidation: MobileValidationService;

  private constructor() {
    this.mobileValidation = MobileValidationService.getInstance();
  }

  static getInstance(): FileValidationService {
    if (!FileValidationService.instance) {
      FileValidationService.instance = new FileValidationService();
    }
    return FileValidationService.instance;
  }

  /**
   * Validate file metadata
   */
  async validateFileMetadata(
    file: File,
    type: keyof typeof FILE_CONFIGS
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      // Validate basic metadata
      const metadataResult = fileMetadataSchema.safeParse({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });

      if (!metadataResult.success) {
        return {
          isValid: false,
          errors: metadataResult.error.errors.map(e => e.message)
        };
      }

      const config = FILE_CONFIGS[type];

      // Check file size
      if (file.size > config.maxSize) {
        return {
          isValid: false,
          errors: [`File size exceeds maximum allowed size of ${config.maxSize / (1024 * 1024)}MB`]
        };
      }

      // Check MIME type
      if (!(config.allowedTypes as readonly string[]).includes(file.type)) {
        return {
          isValid: false,
          errors: [`Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`]
        };
      }

      return {
        isValid: true,
        errors: []
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'File validation failed']
      };
    }
  }

  /**
   * Validate image dimensions
   */
  async validateImageDimensions(file: File): Promise<{
    isValid: boolean;
    errors: string[];
    dimensions?: { width: number; height: number };
  }> {
    return validateImageDimensionsInternal(file);
  }

  /**
   * Validate video metadata
   */
  async validateVideoMetadata(file: File): Promise<{
    isValid: boolean;
    errors: string[];
    metadata?: {
      duration: number;
      width: number;
      height: number;
    };
  }> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const objectUrl = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);

        const config = FILE_CONFIGS.video;
        if (video.duration > config.maxDuration) {
          resolve({
            isValid: false,
            errors: [`Video duration exceeds maximum allowed (${config.maxDuration} seconds)`],
            metadata: {
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight
            }
          });
          return;
        }

        resolve({
          isValid: true,
          errors: [],
          metadata: {
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight
          }
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          isValid: false,
          errors: ['Failed to load video metadata']
        });
      };

      video.src = objectUrl;
    });
  }

  /**
   * Validate document content
   */
  async validateDocumentContent(file: File): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      // For text files, check for malicious content
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        const content = await file.text();
        
        // Check for potentially malicious patterns
        const maliciousPatterns = [
          /<script>/i,
          /javascript:/i,
          /data:/i,
          /vbscript:/i
        ];

        const hasMaliciousContent = maliciousPatterns.some(pattern => 
          pattern.test(content)
        );

        if (hasMaliciousContent) {
          return {
            isValid: false,
            errors: ['Document contains potentially malicious content']
          };
        }
      }

      return {
        isValid: true,
        errors: []
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Failed to validate document content']
      };
    }
  }

  /**
   * Comprehensive file validation
   */
  async validateFile(
    file: File,
    type: keyof typeof FILE_CONFIGS
  ): Promise<{
    isValid: boolean;
    errors: string[];
    metadata?: {
      dimensions?: { width: number; height: number };
      duration?: number;
    };
  }> {
    try {
      // Check mobile context first
      const mobileContext = this.mobileValidation.validateNetworkConditions();
      if (!mobileContext.isValid) {
        return {
          isValid: false,
          errors: mobileContext.errors
        };
      }

      // Validate basic metadata
      const metadataValidation = await this.validateFileMetadata(file, type);
      if (!metadataValidation.isValid) {
        return metadataValidation;
      }

      // Type-specific validation
      switch (type) {
        case 'image': {
          const imageValidation = await this.validateImageDimensions(file);
          return {
            isValid: imageValidation.isValid,
            errors: imageValidation.errors,
            metadata: {
              dimensions: imageValidation.dimensions
            }
          };
        }

        case 'video': {
          const videoValidation = await this.validateVideoMetadata(file);
          return {
            isValid: videoValidation.isValid,
            errors: videoValidation.errors,
            metadata: {
              dimensions: videoValidation.metadata && {
                width: videoValidation.metadata.width,
                height: videoValidation.metadata.height
              },
              duration: videoValidation.metadata?.duration
            }
          };
        }

        case 'document': {
          const documentValidation = await this.validateDocumentContent(file);
          return documentValidation;
        }

        default:
          return {
            isValid: false,
            errors: ['Unsupported file type']
          };
      }

    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'File validation failed']
      };
    }
  }

  /**
   * Get file type configuration
   */
  getFileConfig(type: keyof typeof FILE_CONFIGS) {
    return FILE_CONFIGS[type];
  }
} 