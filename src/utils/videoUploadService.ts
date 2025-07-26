import { getSupabaseClient } from '@/integrations/supabase/client';
import { EducationalContentService } from '@/services/EducationalContentService';
import type { VideoProvider } from '@/types/educationalContent';

export interface VideoUploadResult {
  url: string;
  path: string;
  metadata: {
    size: number;
    type: string;
    duration?: number;
    platform?: VideoProvider;
    videoId?: string;
    thumbnailUrl?: string;
  };
}

export interface VideoUploadOptions {
  spaceId: string;
  lessonId?: string;
  courseId?: string;
}

/**
 * Validate video file before upload
 */
export function validateVideoFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('video/')) {
    return { isValid: false, error: 'File must be a video' };
  }

  // Check file size (100MB limit)
  if (file.size > 100 * 1024 * 1024) {
    return { isValid: false, error: 'Video file must be smaller than 100MB' };
  }

  // Check supported formats
  const supportedFormats = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/quicktime'];
  if (!supportedFormats.some(format => file.type.toLowerCase().includes(format.split('/')[1]))) {
    return { isValid: false, error: 'Supported formats: MP4, MOV, AVI, WebM' };
  }

  return { isValid: true };
}

/**
 * Extract video information from URL using existing service
 */
export function extractVideoInfo(url: string): { 
  provider: VideoProvider; 
  videoId?: string; 
  thumbnailUrl?: string;
  embedUrl?: string;
} {
  const educationalService = new EducationalContentService();
  const videoInfo = educationalService.extractVideoInfo(url);
  
  let thumbnailUrl: string | undefined;
  let embedUrl: string | undefined;

  if (videoInfo.provider === 'youtube' && videoInfo.videoId) {
    thumbnailUrl = `https://img.youtube.com/vi/${videoInfo.videoId}/hqdefault.jpg`;
    embedUrl = `https://www.youtube.com/embed/${videoInfo.videoId}`;
  } else if (videoInfo.provider === 'vimeo' && videoInfo.videoId) {
    embedUrl = `https://player.vimeo.com/video/${videoInfo.videoId}`;
    // Vimeo thumbnails require API call, using placeholder for now
  }

  return {
    provider: videoInfo.provider,
    videoId: videoInfo.videoId,
    thumbnailUrl,
    embedUrl
  };
}

/**
 * Upload video file to Supabase storage
 */
export async function uploadEducationalContentVideo(
  file: File,
  options: VideoUploadOptions
): Promise<VideoUploadResult> {
  const supabase = getSupabaseClient();
  
  // Validate file first
  const validation = validateVideoFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  // Generate unique filename
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const fileName = `lesson-video-${timestamp}-${randomId}.${fileExtension}`;
  
  // Create storage path
  const storagePath = options.courseId 
    ? `${options.spaceId}/courses/${options.courseId}/videos/${fileName}`
    : `${options.spaceId}/lessons/videos/${fileName}`;

  try {
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('space-media')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('space-media')
      .getPublicUrl(storagePath);

    if (!publicUrlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded video');
    }

    // Try to extract video duration (basic attempt - in production might use FFmpeg)
    let duration: number | undefined;
    try {
      // Create a temporary video element to get duration
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        video.addEventListener('loadedmetadata', resolve);
      });
      duration = Math.round(video.duration);
      URL.revokeObjectURL(video.src);
    } catch (error) {
      console.warn('Could not extract video duration:', error);
    }

    return {
      url: publicUrlData.publicUrl,
      path: storagePath,
      metadata: {
        size: file.size,
        type: file.type,
        duration,
      }
    };

  } catch (error) {
    console.error('Video upload error:', error);
    throw error;
  }
}

/**
 * Process video URL (embed or upload) for rich text editor
 */
export async function processVideoForEditor(
  videoData: { url: string; type: 'embed' | 'upload'; file?: File },
  options: VideoUploadOptions
): Promise<{
  embedHtml: string;
  metadata: {
    type: 'embed' | 'upload';
    platform?: VideoProvider;
    videoId?: string;
    url: string;
    thumbnailUrl?: string;
  };
}> {
  let finalUrl = videoData.url;
  let metadata: any = {
    type: videoData.type,
    url: videoData.url
  };

  if (videoData.type === 'embed') {
    // Process video URL
    const videoInfo = extractVideoInfo(videoData.url);
    metadata.platform = videoInfo.provider;
    metadata.videoId = videoInfo.videoId;
    metadata.thumbnailUrl = videoInfo.thumbnailUrl;
    
    // Use embed URL if available
    if (videoInfo.embedUrl) {
      finalUrl = videoInfo.embedUrl;
    }

    // Create iframe embed HTML
    const embedHtml = `<div class="video-container" style="position: relative; width: 100%; max-width: 560px; margin: 16px auto;">
      <div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%;">
        <iframe 
          src="${finalUrl}" 
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      </div>
    </div>`;

    return { embedHtml, metadata };

  } else if (videoData.type === 'upload' && videoData.file) {
    // Upload file and create video element
    const uploadResult = await uploadEducationalContentVideo(videoData.file, options);
    
    metadata.url = uploadResult.url;
    metadata.size = uploadResult.metadata.size;
    metadata.duration = uploadResult.metadata.duration;

    // Create video element HTML
    const embedHtml = `<div class="video-container" style="position: relative; width: 100%; max-width: 560px; margin: 16px auto;">
      <video 
        controls 
        style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
        src="${uploadResult.url}">
        Your browser does not support the video tag.
      </video>
    </div>`;

    return { embedHtml, metadata };
  }

  throw new Error('Invalid video data provided');
} 