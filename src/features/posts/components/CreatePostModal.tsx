import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import { Cross2Icon } from '@radix-ui/react-icons';
import { File, FileText, Image as ImageIcon, Link2, PlayCircle, X, MessageSquare, Film, Tag, Plus } from "lucide-react";
import { useSpaceCategories } from '@/hooks/useSpaceCategories';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { VideoPlayerModal } from '@/components/VideoPlayerModal';

// Define the Attachment interface
export interface Attachment {
  id: string; // Unique ID for React key and removal
  type: 'file' | 'link' | 'video';
  url: string;
  name?: string; // For files and potentially fetched link titles
  fileType?: string; // MIME type for files
  fileSize?: number; // Optional: for display
  videoPlatform?: 'youtube' | 'vimeo' | 'other'; // For video embeds
  videoId?: string | null;
  thumbnailUrl?: string | null;
  isLoading?: boolean; // To show loading state for individual file uploads
}

// Video Link Modal Component
const VideoLinkModal = ({ isOpen, onClose, onSubmit }: { 
  isOpen: boolean; 
  onClose: () => void;
  onSubmit: (url: string) => void;
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Focus the input when the modal opens
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    // Clear input when modal closes
    if (!isOpen) {
      setVideoUrl('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (videoUrl.trim()) {
      onSubmit(videoUrl.trim());
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg data-[state=open]:animate-contentShow focus:outline-none">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Add Video Link
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Enter the URL of the video you want to add. Supported platforms include YouTube and Vimeo.
          </Dialog.Description>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-1">
                Enter Video URL
              </label>
              <input
                ref={inputRef}
                id="video-url"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="e.g., https://youtube.com/watch?v=..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Supported platforms: YouTube, Vimeo, and other video hosting sites
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Add Video
              </button>
            </div>
          </form>
          
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// Add Link Modal Component after the VideoLinkModal component
const LinkModal = ({ isOpen, onClose, onSubmit }: { 
  isOpen: boolean; 
  onClose: () => void;
  onSubmit: (url: string) => void;
}) => {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Focus the input when the modal opens
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    // Clear input when modal closes
    if (!isOpen) {
      setUrl('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg data-[state=open]:animate-contentShow focus:outline-none">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Add Link
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Enter the URL of the link you want to add to your post.
          </Dialog.Description>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 mb-1">
                Enter URL
              </label>
              <input
                ref={inputRef}
                id="link-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g., https://example.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Add a link to an article, website, or other online resource
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Add Link
              </button>
            </div>
          </form>
          
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  currentUserId: string;
  spaceName: string;
  userName: string;
  userAvatarUrl?: string;
  onPostCreated?: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  spaceId,
  currentUserId,
  spaceName,
  userName,
  userAvatarUrl,
  onPostCreated,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showFunPostIdeas, setShowFunPostIdeas] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isVideoLinkModalOpen, setIsVideoLinkModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Video player modal state
  const [isVideoPlayerModalOpen, setIsVideoPlayerModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{url: string; videoId?: string | null; platform?: string}>({url: ''});

  // Pre-written post content templates with emojis
  const postTemplates = {
    introduction: {
      title: "👋 Let's get to know each other!",
      content: "Hi everyone! 👋\n\nI'd love for us all to get better acquainted in this space.\n\n📸 Share a picture of your workspace (if you're comfortable) and tell us a bit about yourself!\n\n• What do you do?\n• How did you find this community?\n• What are you hoping to learn or share here?\n\nI'll start in the comments below! 😊"
    },
    favorites: {
      title: "🌟 Share your favorites with the community!",
      content: "Hey community members! 🌟\n\nLet's have some fun and get to know each other better!\n\nShare with us:\n\n📚 Your favorite book\n🎬 A movie you could watch over and over\n✈️ Your dream travel destination\n\nI'm excited to see all your responses and discover new recommendations! 💭"
    }
  };

  // Function to apply a template
  const applyPostTemplate = (template: 'introduction' | 'favorites') => {
    setTitle(postTemplates[template].title);
    setContent(postTemplates[template].content);
  };

  const { categories, isLoading: categoriesLoading, error: categoriesError } = useSpaceCategories(spaceId);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setContent('');
      setSelectedCategoryId(null);
      setShowFunPostIdeas(true);
      setAttachments([]);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!content.trim() && !title.trim()) {
      console.error("Post title or content cannot be empty.");
      return;
    }

    if (!currentUserId) {
      console.error("User ID is missing, cannot create post.");
      return;
    }
    
    let categoryToSave = selectedCategoryId;
    if (!categoryToSave && categories && categories.length > 0) {
      const generalDiscussionCategory = categories.find(
        (cat) => cat.name.toLowerCase() === 'general discussion'
      );
      if (generalDiscussionCategory) {
        categoryToSave = generalDiscussionCategory.id;
      }
    }

    console.log("Creating post with category:", categoryToSave);
    console.log("Available categories:", categories);

    try {
      // Handle attachments (simplified example)
      const uploadedAttachmentUrls: { url: string; name?: string; type: Attachment['type']; fileType?: string; fileSize?: number; videoPlatform?: string; videoId?: string; thumbnailUrl?: string }[] = [];
      for (const attachment of attachments) {
        if (attachment.type === 'file' && attachment.url.startsWith('blob:')) {
          // This indicates a file that needs to be uploaded
          // Implement actual file upload logic here, then add its final URL
          // For now, let's assume it gets a placeholder URL
          // In a real scenario, this would involve uploading to Supabase Storage
          console.warn("File upload for blob URL not implemented in this snippet, using placeholder for:", attachment.name);
          uploadedAttachmentUrls.push({ 
            url: `https://example.com/uploads/${attachment.name || 'uploaded_file'}`,
            name: attachment.name,
            type: 'file',
            fileType: attachment.fileType,
            fileSize: attachment.fileSize
          });
        } else {
          // Links or already uploaded files/videos
          uploadedAttachmentUrls.push({ 
            url: attachment.url, 
            name: attachment.name, 
            type: attachment.type,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
            videoPlatform: attachment.videoPlatform,
            videoId: attachment.videoId,
            thumbnailUrl: attachment.thumbnailUrl
          });
        }
      }

      // Insert post with attachment URLs
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          title: title.trim() || null,
          content: content.trim(),
          user_id: currentUserId,
          space_id: spaceId,
          category_id: categoryToSave,
          media_urls: uploadedAttachmentUrls as Json, // Cast to Json as Supabase expects
        })
        .select()
        .single();

      if (postError) {
        throw postError;
      }

      // Insert into user_activity_log after post creation
      if (postData && postData.id) {
        await supabase.from('user_activity_log').insert({
          user_id: currentUserId,
          type: 'post',
          ref_id: postData.id,
          meta: { space_id: spaceId, title: title.trim() }
        });
      }

      // ... (success toast, onClose, onPostCreated)
      resetForm();

    } catch (error: unknown) {
      console.error("Error creating post:", error);
      // Show error toast
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedCategoryId(null);
    setAttachments([]);
    // Optionally reset other states like showFunPostIdeas if needed
  };

  // Helper to get a more specific icon based on file type
  const getFileIcon = (fileType?: string, attachmentType?: Attachment['type']) => {
    if (attachmentType === 'link') return <Link2 className="h-5 w-5 text-blue-500 flex-shrink-0" />;
    if (attachmentType === 'video') return <PlayCircle className="h-5 w-5 text-red-500 flex-shrink-0" />;
    
    if (fileType?.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-purple-500 flex-shrink-0" />;
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5 text-orange-500 flex-shrink-0" />;
    
    // Default file icon
    return <File className="h-5 w-5 text-gray-500 flex-shrink-0" />;
  };

  // Check if URL is an image
  const isImageUrl = (url: string, fileType?: string): boolean => {
    if (fileType?.startsWith('image/')) return true;
    
    // Simple URL extension check as fallback
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
    return extensions.some(ext => url.toLowerCase().endsWith(ext));
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined) return '';
    
    if (bytes < 1024) return `${bytes} B`;
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    else if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    else return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Function to remove an attachment
  const handleRemoveAttachment = (attachmentId: string) => {
    // Before removing from state, check if it was a file and if we need to delete from storage
    const attachmentToRemove = attachments.find(att => att.id === attachmentId);
    if (attachmentToRemove && attachmentToRemove.type === 'file' && attachmentToRemove.url && !attachmentToRemove.url.startsWith('#') && !attachmentToRemove.isLoading) {
      // This is a successfully uploaded file, consider deleting it from storage
      // For simplicity, we will skip immediate deletion from storage on client-side removal for now.
      // Deletion can be handled via cron jobs for orphaned files or when a post is deleted.
      console.log(`File ${attachmentToRemove.name} was uploaded. Deletion from storage upon pre-submit removal is not implemented yet.`);
    }
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Create a temporary array to hold new attachments with loading state
    const newAttachments: Attachment[] = Array.from(files).map(file => ({
      id: uuidv4(),
      type: 'file',
      url: URL.createObjectURL(file), // Temporary blob URL for preview
      name: file.name,
      fileType: file.type,
      fileSize: file.size,
      isLoading: true, // Set loading to true initially
    }));
    setAttachments(prev => [...prev, ...newAttachments]);

    // Simulate upload for each file (replace with actual upload logic)
    for (const tempAttachment of newAttachments) {
      try {
        // --- SIMULATE UPLOAD --- (replace with actual Supabase storage upload)
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
        const finalUrl = `https://example.com/uploaded/${tempAttachment.name}`;
        // --- END SIMULATE UPLOAD ---

        // Update the specific attachment with the final URL and remove loading state
        setAttachments(prev => prev.map(att => 
          att.id === tempAttachment.id 
            ? { ...att, url: finalUrl, isLoading: false } 
            : att
        ));
      } catch (uploadError: unknown) {
        console.error(`Error uploading ${tempAttachment.name}:`, uploadError);
        // Update the specific attachment to remove loading state and perhaps mark as error
        setAttachments(prev => prev.map(att => 
          att.id === tempAttachment.id 
            ? { ...att, isLoading: false, name: `${att.name} (upload failed)` } 
            : att
        ));
      }
    }

    // Clear the file input for next selection
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleAddLink = () => {
    // Open the custom modal instead of using window.prompt
    setIsLinkModalOpen(true);
  };
  
  const handleAddVideoLink = () => {
    // Open the custom modal instead of using window.prompt
    setIsVideoLinkModalOpen(true);
  };
  
  // Add this utility function for extracting video IDs near the top of the file
  // Add these utility functions for video handling
  const extractVideoInfo = (url: string): { platform: 'youtube' | 'vimeo' | 'other'; videoId: string | null; thumbnailUrl: string | null } => {
    // YouTube pattern
    // YouTube pattern
    const youtubePatterns = [
      new RegExp("(?:youtube\\.com/watch\\?v=|youtu\\.be/|youtube\\.com/embed/|youtube\\.com/v/|youtube\\.com/user/.+/|youtube\\.com/user/.+#\\w/\\w/|youtube\\.com/shorts/|youtube\\.com/playlist\\?|youtube\\.com/watch\\?|youtube\\.com/(?:(?:watch|attribution_link)\\?(?:.*?)v(?:i)?=|(?:embed|v|vi|user)/))([^&#?/\\s]+)"),
      new RegExp("(?:youtube\\.com/shorts/)([^&#?]+)")
    ];

    // Vimeo pattern
    const vimeoPattern = new RegExp("(?:vimeo\\\\.com/(?:channels/(?:\\\\w+/)?|groups/(?:[^/]*)/videos/|album/(?:\\\\d+)/video/|video/|)(\\\\d+)(?:$|/|\\\\?))");

    // Check for YouTube
    for (const pattern of youtubePatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const videoId = match[1];
        return {
          platform: 'youtube',
          videoId,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        };
      }
    }

    // Check for Vimeo
    const vimeoMatch = url.match(vimeoPattern);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        platform: 'vimeo',
        videoId: vimeoMatch[1],
        thumbnailUrl: null
      };
    }

    // Unknown video format
    return {
      platform: 'other',
      videoId: null,
      thumbnailUrl: null
    };
  };

  // Enhance the handleVideoUrlSubmit function to include video preview info
  const handleVideoUrlSubmit = (url: string) => {
    const { platform, videoId, thumbnailUrl } = extractVideoInfo(url);
    
    setAttachments(prev => [...prev, {
      id: uuidv4(),
      type: 'video',
      url: url,
      name: url,
      videoPlatform: platform,
      videoId,
      thumbnailUrl
    }]);
  };

  // Add handleLinkSubmit function next to handleVideoUrlSubmit
  const handleLinkSubmit = (url: string) => {
    setAttachments(prev => [...prev, {
      id: uuidv4(),
      type: 'link',
      url: url,
      name: url,
    }]);
  };

  // Open video player for a specific video
  const handleVideoPreviewClick = (
    e: React.MouseEvent<HTMLDivElement>,
    att: Attachment
  ) => {
    e.stopPropagation();
    setSelectedVideo({
      url: att.url,
      videoId: att.videoId,
      platform: att.videoPlatform
    });
    setIsVideoPlayerModalOpen(true);
  };

  if (!isOpen) {
    return null;
  }

  // CSS class styles
  const toolbarButtonClass = "text-gray-500 hover:text-gray-700 flex items-center px-2 py-1.5 rounded-md hover:bg-gray-100 text-sm";

  // Define Json type for the cast, if not available from Supabase types directly
  // This is a common definition for Json values.
  type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg data-[state=open]:animate-contentShow focus:outline-none">
            <Dialog.Title className="mb-4 text-lg font-medium text-gray-900">
              <div className="flex items-center">
                {userAvatarUrl && (
                  <img src={userAvatarUrl} alt={userName} className="mr-3 h-10 w-10 rounded-full" />
                )}
                <div>
                  {userName} posting in <span className="font-semibold">{spaceName}</span>
                </div>
              </div>
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Create a new post in {spaceName}. You can add a title, content, attachments, and select a category.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                className="absolute right-4 top-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                aria-label="Close"
              >
                <Cross2Icon />
              </button>
            </Dialog.Close>

            <div className="mb-4">
              <input
                type="text"
                id="post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title..."
                className="block w-full rounded-md py-2 placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-lg font-semibold"
              />
            </div>

            <div className="mb-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write something..."
                rows={6}
                className="block w-full rounded-md py-2 placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
              />
            </div>
            
            {showFunPostIdeas && (
              <div className="relative mb-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                <h4 className="font-semibold">Fun post ideas to kick off your community:</h4>
                <ul className="list-disc pl-5 mt-1">
                  <li 
                    className="cursor-pointer hover:text-blue-900 transition-colors mt-1"
                    onClick={() => applyPostTemplate('introduction')}
                  >
                    Ask members to introduce themselves and share a pic of their workspace
                  </li>
                  <li 
                    className="cursor-pointer hover:text-blue-900 transition-colors mt-1"
                    onClick={() => applyPostTemplate('favorites')}
                  >
                    Ask members to share their favourite movie, book, travel destination, etc
                  </li>
                </ul>
                <button 
                  onClick={() => setShowFunPostIdeas(false)}
                  className="absolute top-2 right-2 text-blue-500 hover:text-blue-700 p-1"
                  aria-label="Dismiss fun post ideas"
                >
                  <Cross2Icon className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Display added attachments */}
            {attachments.length > 0 && (
              <div className="mt-4 mb-3 space-y-3">
                {/* Image previews - show first, if any */}
                {attachments.some(att => att.type === 'file' && att.fileType?.startsWith('image/') || isImageUrl(att.url)) && (
                  <div className="space-y-2">
                    {attachments
                      .filter(att => att.type === 'file' && (att.fileType?.startsWith('image/') || isImageUrl(att.url)))
                      .map(att => (
                        <div key={att.id} className="relative rounded-lg overflow-hidden border border-gray-200">
                          <img 
                            src={att.url} 
                            alt={att.name || "Attached image"} 
                            className="w-full max-h-72 object-contain"
                          />
                          <button
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-colors"
                            aria-label="Remove attachment"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ))
                    }
                  </div>
                )}

                {/* Video links */}
                {attachments.some(att => att.type === 'video') && (
                  <div className="space-y-2">
                    {attachments
                      .filter(att => att.type === 'video')
                      .map(att => (
                        <div 
                          key={att.id} 
                          className="relative rounded-lg overflow-hidden border border-gray-200 group"
                        >
                          {/* Video Thumbnail - with subtle play button */}
                          <div 
                            className="relative aspect-video w-full bg-black cursor-pointer"
                            onClick={(e) => handleVideoPreviewClick(e, att)}
                          >
                            {att.thumbnailUrl ? (
                              <img 
                                src={att.thumbnailUrl} 
                                alt="Video thumbnail" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200"></div>
                            )}
                            
                            {/* Small subtle play button overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-black bg-opacity-60 group-hover:bg-opacity-80 transition-opacity">
                                <PlayCircle className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            
                            {/* Remove Button - positioned in top right corner */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAttachment(att.id);
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black bg-opacity-60 hover:bg-opacity-70 text-white transition-colors"
                              aria-label="Remove attachment"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}

                {/* Other files & links */}
                {attachments.some(att => 
                  (att.type === 'file' && !att.fileType?.startsWith('image/') && !isImageUrl(att.url)) || 
                  att.type === 'link'
                ) && (
                  <div className="space-y-2">
                    {attachments
                      .filter(att => 
                        (att.type === 'file' && !att.fileType?.startsWith('image/') && !isImageUrl(att.url)) || 
                        att.type === 'link'
                      )
                      .map(att => (
                        <div 
                          key={att.id} 
                          className="relative rounded-md bg-gray-50 border border-gray-200 p-3 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center">
                            {getFileIcon(att.fileType, att.type)}
                            <div className="flex-grow min-w-0">
                              <span className="font-medium text-blue-600">{att.name || att.url}</span>
                              {att.fileType && !att.fileType.startsWith('image/') && (
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <span className="truncate">{att.fileType}</span>
                                  {att.fileSize && <span className="ml-2">{formatFileSize(att.fileSize)}</span>}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveAttachment(att.id)}
                              className="p-1 rounded-full hover:bg-gray-200 transition-colors ml-3"
                              aria-label="Remove attachment"
                            >
                              <X className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}

            <div className="mb-4 flex items-center space-x-2 border-t border-b py-3">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className={toolbarButtonClass}>
                    <FileText className="h-5 w-5 mr-1" />
                    <span>Attachment</span>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content 
                    className="z-50 min-w-[12rem] overflow-hidden rounded-md border bg-white p-1 text-gray-900 shadow-md data-[state=open]:animate-in data-[side=bottom]:slide-in-from-top-2"
                    sideOffset={5}
                  >
                    <DropdownMenu.Item 
                      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-gray-100 focus:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      onSelect={() => fileInputRef.current?.click()}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span>Attach file</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item 
                      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-gray-100 focus:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      onSelect={handleAddLink}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      <span>Add link</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item 
                      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-gray-100 focus:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      onSelect={handleAddVideoLink}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      <span>Add video link</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileSelected} 
              />

              <button className={toolbarButtonClass}>
                <MessageSquare className="h-5 w-5 mr-1" />
                <span>Poll</span>
              </button>
              
              <button className={toolbarButtonClass}>
                <Film className="h-5 w-5 mr-1" />
                <span>GIF</span>
              </button>
              
              <Select.Root
                value={selectedCategoryId || undefined}
                onValueChange={setSelectedCategoryId}
              >
                <Select.Trigger className={toolbarButtonClass} aria-label="Select category">
                  <Tag className="h-5 w-5 mr-1" />
                  <Select.Value placeholder="Category" />
                  <Select.Icon className="ml-1">
                    <ChevronDownIcon className="h-4 w-4" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content 
                    className="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-gray-900 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                    position="popper"
                    sideOffset={5}
                  >
                    <Select.Viewport className="p-1">
                      {categoriesLoading && (
                        <Select.Item value="loading" disabled className="px-2 py-1.5 text-sm text-gray-400">
                          Loading categories...
                        </Select.Item>
                      )}
                      {categoriesError && (
                        <Select.Item value="error" disabled className="px-2 py-1.5 text-sm text-red-500">
                          Error loading categories
                        </Select.Item>
                      )}
                      {!categoriesLoading && !categoriesError && categories.length === 0 && (
                        <Select.Item value="no-categories" disabled className="px-2 py-1.5 text-sm text-gray-400">
                          No categories available
                        </Select.Item>
                      )}
                      {!categoriesLoading && !categoriesError && categories.map((category) => (
                        <Select.Item
                          key={category.id}
                          value={category.id}
                          className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-gray-100 focus:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                        >
                          <Select.ItemIndicator className="absolute left-2 inline-flex items-center justify-center">
                            <CheckIcon className="h-4 w-4" />
                          </Select.ItemIndicator>
                          <Select.ItemText>{category.name}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                className="rounded-md bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              >
                Publish Post
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Video Link Modal - outside the main Dialog */}
      <VideoLinkModal 
        isOpen={isVideoLinkModalOpen}
        onClose={() => setIsVideoLinkModalOpen(false)}
        onSubmit={handleVideoUrlSubmit}
      />

      {/* Link Modal - outside the main Dialog */}
      <LinkModal 
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSubmit={handleLinkSubmit}
      />
      
      {/* Video Player Modal */}
      <VideoPlayerModal 
        isOpen={isVideoPlayerModalOpen}
        onClose={() => setIsVideoPlayerModalOpen(false)}
        videoUrl={selectedVideo.url}
        videoId={selectedVideo.videoId}
        videoPlatform={selectedVideo.platform as 'youtube' | 'vimeo' | 'other' | undefined}
      />
    </>
  );
};