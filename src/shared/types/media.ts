/**
 * Shared media types and interfaces
 */

// Media item interface for standardization
export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  videoId?: string;
  storagePath?: string;
}

// Upload progress callback type
export type UploadProgressCallback = (progress: number) => void;

// Migration progress callback type
export type MigrationProgressCallback = (current: number, total: number) => void;

// Storage upload result
export interface StorageUploadResult {
  url: string;
  path: string;
}

// Add media to database interface
export interface AddMediaRequest extends Omit<MediaItem, 'id'> {
  order: number;
  created_by?: string;
} 