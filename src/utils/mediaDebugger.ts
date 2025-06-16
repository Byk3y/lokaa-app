/**
 * Media Debugging Utilities
 * Helper functions to test and debug media URL conversion and thumbnail display
 */

export class MediaDebugger {
  /**
   * Test media URL conversion from database format to PostCard format
   */
  static testMediaConversion(mediaUrls: string[]) {
    console.log('🎬 [MediaDebugger] Testing media URL conversion...');
    console.log('Input media URLs:', mediaUrls);
    
    const detectMediaInfo = (url: string): { type: 'file' | 'link' | 'video'; fileType?: string; videoPlatform?: 'youtube' | 'vimeo' | 'other'; videoId?: string | null; thumbnailUrl?: string | null } => {
      if (!url || typeof url !== 'string') return { type: 'file' };
      
      const lowercaseUrl = url.toLowerCase();
      
      // Check for video patterns
      if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
        const videoId = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1] || null;
        return {
          type: 'video',
          videoPlatform: 'youtube',
          videoId,
          thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
        };
      }
      
      if (lowercaseUrl.includes('vimeo.com')) {
        const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1] || null;
        return {
          type: 'video',
          videoPlatform: 'vimeo',
          videoId
        };
      }
      
      if (lowercaseUrl.includes('.mp4') || lowercaseUrl.includes('.webm') || lowercaseUrl.includes('.mov') || lowercaseUrl.includes('.avi')) {
        return {
          type: 'video',
          videoPlatform: 'other'
        };
      }
      
      // Check for image patterns - treat as files with image MIME types
      if (lowercaseUrl.includes('.jpg') || lowercaseUrl.includes('.jpeg')) {
        return { type: 'file', fileType: 'image/jpeg' };
      }
      if (lowercaseUrl.includes('.png')) {
        return { type: 'file', fileType: 'image/png' };
      }
      if (lowercaseUrl.includes('.gif')) {
        return { type: 'file', fileType: 'image/gif' };
      }
      if (lowercaseUrl.includes('.webp')) {
        return { type: 'file', fileType: 'image/webp' };
      }
      if (lowercaseUrl.includes('.svg')) {
        return { type: 'file', fileType: 'image/svg+xml' };
      }
      if (lowercaseUrl.includes('giphy.com') || lowercaseUrl.includes('imgur.com')) {
        return { type: 'file', fileType: 'image/gif' };
      }
      
      // Default to file
      return { type: 'file' };
    };
    
    const convertedMedia = mediaUrls.filter(url => url && typeof url === 'string').map((url, index) => {
      const mediaInfo = detectMediaInfo(url);
      return {
        id: `test-${index}`, 
        url, 
        type: mediaInfo.type,
        ...(mediaInfo.fileType && { fileType: mediaInfo.fileType }),
        ...(mediaInfo.videoPlatform && { videoPlatform: mediaInfo.videoPlatform }),
        ...(mediaInfo.videoId && { videoId: mediaInfo.videoId }),
        ...(mediaInfo.thumbnailUrl && { thumbnailUrl: mediaInfo.thumbnailUrl })
      };
    });
    
    console.log('Converted media attachments:', convertedMedia);
    
    // Test thumbnail generation
    convertedMedia.forEach((media, index) => {
      console.log(`Media ${index + 1}:`, {
        url: media.url,
        type: media.type,
        fileType: media.fileType,
        videoPlatform: media.videoPlatform,
        videoId: media.videoId,
        thumbnailUrl: media.thumbnailUrl,
        willShowThumbnail: !!(media.type === 'video' && media.thumbnailUrl) || (media.type === 'file' && media.fileType?.startsWith('image/'))
      });
    });
    
    return convertedMedia;
  }
  
  /**
   * Test specific post media URLs
   */
  static async testPostMedia(postId: string) {
    console.log('🔍 [MediaDebugger] Testing post media for ID:', postId);
    
    try {
      // This would normally fetch from Supabase, but for debugging we'll use window data
      const posts = (window as any).debugPosts || [];
      const post = posts.find((p: any) => p.id === postId);
      
      if (!post) {
        console.log('❌ Post not found in debug data');
        return;
      }
      
      console.log('📄 Post found:', {
        id: post.id,
        title: post.title,
        media_urls: post.media_urls
      });
      
      if (post.media_urls && Array.isArray(post.media_urls)) {
        this.testMediaConversion(post.media_urls);
      } else {
        console.log('ℹ️ No media URLs found for this post');
      }
      
    } catch (error) {
      console.error('❌ Error testing post media:', error);
    }
  }
}

// Make it available globally for debugging
(window as any).MediaDebugger = MediaDebugger;

console.log('🎬 [MediaDebugger] Media debugging utilities loaded');
console.log('Available functions:');
console.log('- window.MediaDebugger.testMediaConversion(mediaUrls)');
console.log('- window.MediaDebugger.testPostMedia(postId)');

// Test the media conversion with sample data
export const testMediaConversionWithSamples = () => {
  console.log('🧪 [MediaDebugger] Testing media conversion with sample data...');
  
  // Sample media URLs that might be in the database
  const sampleMediaUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://example.com/image.jpg',
    'https://example.com/image.png',
    'https://example.com/video.mp4',
    'https://giphy.com/gifs/example-gif-123',
    'https://imgur.com/example.gif'
  ];
  
  // Test the detectMediaInfo function from useCachedPosts
  const detectMediaInfo = (url: string): { type: 'file' | 'link' | 'video'; fileType?: string; videoPlatform?: 'youtube' | 'vimeo' | 'other'; videoId?: string | null; thumbnailUrl?: string | null } => {
    if (!url || typeof url !== 'string') return { type: 'file' };
    
    const lowercaseUrl = url.toLowerCase();
    
    // Check for video patterns
    if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1] || null;
      return {
        type: 'video',
        videoPlatform: 'youtube',
        videoId,
        thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
      };
    }
    
    if (lowercaseUrl.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1] || null;
      return {
        type: 'video',
        videoPlatform: 'vimeo',
        videoId
      };
    }
    
    if (lowercaseUrl.includes('.mp4') || lowercaseUrl.includes('.webm') || lowercaseUrl.includes('.mov') || lowercaseUrl.includes('.avi')) {
      return {
        type: 'video',
        videoPlatform: 'other'
      };
    }
    
    // Check for image patterns - treat as files with image MIME types
    if (lowercaseUrl.includes('.jpg') || lowercaseUrl.includes('.jpeg')) {
      return { type: 'file', fileType: 'image/jpeg' };
    }
    if (lowercaseUrl.includes('.png')) {
      return { type: 'file', fileType: 'image/png' };
    }
    if (lowercaseUrl.includes('.gif')) {
      return { type: 'file', fileType: 'image/gif' };
    }
    if (lowercaseUrl.includes('.webp')) {
      return { type: 'file', fileType: 'image/webp' };
    }
    if (lowercaseUrl.includes('.svg')) {
      return { type: 'file', fileType: 'image/svg+xml' };
    }
    if (lowercaseUrl.includes('giphy.com') || lowercaseUrl.includes('imgur.com')) {
      return { type: 'file', fileType: 'image/gif' };
    }
    
    // Default to file
    return { type: 'file' };
  };
  
  console.log('🧪 [MediaDebugger] Testing media conversion:');
  sampleMediaUrls.forEach(url => {
    const mediaInfo = detectMediaInfo(url);
    const attachment = {
      id: `test-${Date.now()}`,
      url,
      type: mediaInfo.type,
      ...(mediaInfo.fileType && { fileType: mediaInfo.fileType }),
      ...(mediaInfo.videoPlatform && { videoPlatform: mediaInfo.videoPlatform }),
      ...(mediaInfo.videoId && { videoId: mediaInfo.videoId }),
      ...(mediaInfo.thumbnailUrl && { thumbnailUrl: mediaInfo.thumbnailUrl })
    };
    
    console.log(`📎 ${url} ->`, attachment);
  });
  
  return sampleMediaUrls.map(url => {
    const mediaInfo = detectMediaInfo(url);
    return {
      id: `test-${Date.now()}-${Math.random()}`,
      url,
      type: mediaInfo.type,
      ...(mediaInfo.fileType && { fileType: mediaInfo.fileType }),
      ...(mediaInfo.videoPlatform && { videoPlatform: mediaInfo.videoPlatform }),
      ...(mediaInfo.videoId && { videoId: mediaInfo.videoId }),
      ...(mediaInfo.thumbnailUrl && { thumbnailUrl: mediaInfo.thumbnailUrl })
    };
  });
};

// Add to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).MediaDebugger = {
    ...(window as any).MediaDebugger,
    testMediaConversionWithSamples
  };
}

// Test with actual database media formats
export const testDatabaseMediaFormats = () => {
  console.log('🧪 [MediaDebugger] Testing actual database media formats...');
  
  // Test format 1: Direct object with URL
  const format1 = {
    url: "https://nmddvthcsyppyjncqfsk.supabase.co/storage/v1/object/public/post-attachments/spaces/235e68d1-89df-4d2d-8945-e7756d60de20/posts/1fca49da-3a53-4a0f-aeb3-63b567f35f84/1749249583982-d4688890-86CF2CBF-B2D0-4D8C-AF07-BAF6E4BE897D.PNG",
    name: "86CF2CBF-B2D0-4D8C-AF07-BAF6E4BE897D.PNG",
    type: "file",
    fileSize: 215273,
    fileType: "image/png",
    storagePath: "spaces/235e68d1-89df-4d2d-8945-e7756d60de20/posts/1fca49da-3a53-4a0f-aeb3-63b567f35f84/1749249583982-d4688890-86CF2CBF-B2D0-4D8C-AF07-BAF6E4BE897D.PNG"
  };
  
  // Test format 2: Complex Giphy object
  const format2 = {
    url: {
      id: "3ohrygi3kjhDVz5N8A",
      url: "https://giphy.com/gifs/eid-mubarak-happy-al-fitr-3ohrygi3kjhDVz5N8A",
      slug: "eid-mubarak-happy-al-fitr-3ohrygi3kjhDVz5N8A",
      type: "gif",
      title: "Eid Al Fitr GIF",
      images: {
        original: {
          url: "https://media4.giphy.com/media/3ohrygi3kjhDVz5N8A/giphy.gif?cid=c53d30ef2brn2oenqtibo71b5m2ypd8gamm5daj2jx9obz10&ep=v1_gifs_trending&rid=giphy.gif&ct=g",
          width: 480,
          height: 312
        }
      }
    },
    name: "GIF Image",
    type: "file",
    fileType: "image/gif"
  };
  
  console.log('🧪 [MediaDebugger] Format 1 (Direct URL):', format1);
  console.log('🧪 [MediaDebugger] Format 2 (Giphy Object):', format2);
  
  // Test the conversion logic
  const testConversion = (mediaItem: any, index: number) => {
    let url: string;
    let existingType: string | undefined;
    let existingFileType: string | undefined;
    
    console.log(`🧪 [MediaDebugger] Processing media item ${index}:`, mediaItem);
    
    if (typeof mediaItem === 'string') {
      url = mediaItem;
      console.log(`🧪 [MediaDebugger] String format URL:`, url);
    } else if (mediaItem && typeof mediaItem === 'object') {
      if (mediaItem.url) {
        if (typeof mediaItem.url === 'string') {
          url = mediaItem.url;
          console.log(`🧪 [MediaDebugger] Object with direct URL:`, url);
        } else if (mediaItem.url.url) {
          url = mediaItem.url.url;
          console.log(`🧪 [MediaDebugger] Object with nested URL:`, url);
        } else {
          console.warn('🧪 [MediaDebugger] Invalid media URL structure:', mediaItem);
          return null;
        }
      } else {
        console.warn('🧪 [MediaDebugger] Media item missing URL:', mediaItem);
        return null;
      }
      
      existingType = mediaItem.type;
      existingFileType = mediaItem.fileType;
      console.log(`🧪 [MediaDebugger] Existing type info:`, { existingType, existingFileType });
    } else {
      console.warn('🧪 [MediaDebugger] Invalid media item:', mediaItem);
      return null;
    }
    
    const result = {
      id: `test-${index}`,
      url,
      type: existingType || 'file',
      ...(existingFileType && { fileType: existingFileType })
    };
    
    console.log(`🧪 [MediaDebugger] Final result:`, result);
    return result;
  };
  
  console.log('🧪 [MediaDebugger] Testing Format 1:');
  testConversion(format1, 0);
  
  console.log('🧪 [MediaDebugger] Testing Format 2:');
  testConversion(format2, 1);
  
  return { format1, format2 };
}; 