import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { Attachment, VideoInfo } from '../types';
import { 
  generateStoragePath,
  isImageUrl
} from '../utils/fileUtils';
import { extractVideoInfo } from '../utils/urlUtils';

interface UseAttachmentsProps {
  spaceId: string;
  userId: string;
  isOpen: boolean;
  editMode?: boolean;
  initialAttachments?: Attachment[];
}

/**
 * Custom hook to manage post attachments (files, links, videos)
 */
export function useAttachments({
  spaceId,
  userId,
  isOpen,
  editMode = false,
  initialAttachments = []
}: UseAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isVideoLinkModalOpen, setIsVideoLinkModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Video player modal state
  const [isVideoPlayerModalOpen, setIsVideoPlayerModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string; 
    videoId?: string | null; 
    platform?: string
  }>({url: ''});
  
  // Load initial attachments when in edit mode or when provided
  useEffect(() => {
    if (isOpen && initialAttachments?.length) {
      setAttachments(initialAttachments.map(att => ({
        ...att,
        id: att.id || uuidv4()
      })));
    } else if (!isOpen) {
      setAttachments([]);
      setUploadingFiles(new Map());
    }
  }, [isOpen, initialAttachments]);

  // Reset attachments
  const resetAttachments = () => {
    setAttachments([]);
    setUploadingFiles(new Map());
  };
  
  // Add file attachment via file input
  const triggerFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file selection - FIXED: Upload first, then add to list
  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Process files one by one to ensure proper upload
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = uuidv4();
      
      // Add to uploading map with initial progress of 0
      setUploadingFiles(prev => new Map(prev).set(fileId, 0));
      
      try {
        console.log(`Starting upload for file: ${file.name} (${file.size} bytes)`);
        
        // Generate storage path
        const storagePath = generateStoragePath(spaceId, userId, file.name);
        
        // Upload to Supabase storage first
        const { error: uploadError, data } = await getSupabaseClient().storage
          .from('post-attachments')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            // @ts-ignore - onUploadProgress is not in the official types yet
            onUploadProgress: (progress) => {
              const percentage = Math.round((progress.loaded / progress.total) * 100);
              setUploadingFiles(prev => new Map(prev).set(fileId, percentage));
            }
          });
          
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }
        
        // Get public URL
        const { data: { publicUrl } } = getSupabaseClient().storage
          .from('post-attachments')
          .getPublicUrl(storagePath);
          
        console.log(`Upload successful for ${file.name}. Public URL: ${publicUrl}`);
        
        // Create attachment with Supabase URL (not blob URL)
        const newAttachment: Attachment = {
          id: fileId,
          type: 'file',
                  url: publicUrl,
          name: file.name,
          fileType: file.type,
          fileSize: file.size,
                  storagePath,
                  isLoading: false 
        };
        
        console.log('[useAttachments] Created attachment for display:', {
          id: newAttachment.id,
          name: newAttachment.name,
          fileType: newAttachment.fileType,
          url: newAttachment.url,
          isImage: newAttachment.fileType?.startsWith('image/'),
          isGif: newAttachment.fileType === 'image/gif'
        });
        
        // Add to attachments list only after successful upload
        setAttachments(prev => [...prev, newAttachment]);
        
      } catch (error) {
        console.error('Error uploading file:', error);
        
        // Create error attachment to show user what failed
        const errorAttachment: Attachment = {
          id: fileId,
          type: 'file',
          url: '', // Empty URL indicates error
          name: file.name,
          fileType: file.type,
          fileSize: file.size,
          isLoading: false
        };
        
        setAttachments(prev => [...prev, errorAttachment]);
      } finally {
        // Remove from uploading map
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          newMap.delete(fileId);
          return newMap;
        });
      }
    }
    
    // Reset file input
    if (event.target.value) {
      event.target.value = '';
    }
  };
  
  // Add video link
  const handleAddVideoLink = () => {
    setIsVideoLinkModalOpen(true);
  };
  
  // Add regular link
  const handleAddLink = () => {
    setIsLinkModalOpen(true);
  };
  
  // Process video link submission
  const handleVideoUrlSubmit = (url: string) => {
    const videoInfo = extractVideoInfo(url);
    
    const newAttachment: Attachment = {
      id: uuidv4(),
      type: 'video',
      url,
      videoPlatform: videoInfo.platform,
      videoId: videoInfo.videoId,
      thumbnailUrl: videoInfo.thumbnailUrl
    };
    
    setAttachments(prev => [...prev, newAttachment]);
    setIsVideoLinkModalOpen(false);
  };
  
  // Process link submission
  const handleLinkSubmit = (url: string) => {
    const newAttachment: Attachment = {
      id: uuidv4(),
      type: 'link',
      url,
      name: url
    };
    
    setAttachments(prev => [...prev, newAttachment]);
    setIsLinkModalOpen(false);
  };
  
  // Remove an attachment
  const handleRemoveAttachment = async (attachmentId: string) => {
    const attachmentToRemove = attachments.find(att => att.id === attachmentId);
    
    // If the attachment has a storage path, delete it from storage
    if (attachmentToRemove?.storagePath) {
      try {
        const { error } = await getSupabaseClient().storage
          .from('post-attachments')
          .remove([attachmentToRemove.storagePath]);
          
        if (error) {
          console.error('Error removing file from storage:', error);
        }
      } catch (error) {
        console.error('Error removing file from storage:', error);
      }
    }
    
    // Remove from local state
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
    
    // If it's a blob URL, revoke it to free memory (cleanup for any legacy blob URLs)
    if (attachmentToRemove?.url.startsWith('blob:')) {
      URL.revokeObjectURL(attachmentToRemove.url);
    }
  };
  
  // Handle video preview click
  const handleVideoPreviewClick = (e: React.MouseEvent<HTMLDivElement>, attachment: Attachment) => {
    e.stopPropagation();
    
    if (attachment.type === 'video' && attachment.url) {
    setSelectedVideo({
      url: attachment.url,
      videoId: attachment.videoId,
      platform: attachment.videoPlatform
    });
    setIsVideoPlayerModalOpen(true);
    }
  };
  
  return {
    attachments,
    isVideoLinkModalOpen,
    setIsVideoLinkModalOpen,
    isLinkModalOpen,
    setIsLinkModalOpen,
    fileInputRef,
    isVideoPlayerModalOpen,
    setIsVideoPlayerModalOpen,
    selectedVideo,
    uploadingFiles,
    resetAttachments,
    triggerFileSelector,
    handleFileSelected,
    handleAddVideoLink: handleAddVideoLink,
    handleAddLink: handleAddLink,
    handleVideoUrlSubmit,
    handleLinkSubmit,
    handleRemoveAttachment,
    handleVideoPreviewClick
  };
} 