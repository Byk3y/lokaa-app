import React from 'react';
import { VideoIcon, FileText, File, LinkIcon } from 'lucide-react';
import { UploadProgressIndicator } from './UploadProgressIndicator';
import type { AttachmentPreviewGridProps } from '../types';

/**
 * Grid component for previewing all attachments (GIFs, files, videos, etc.)
 */
export const AttachmentPreviewGrid: React.FC<AttachmentPreviewGridProps> = ({
  selectedContentGifUrls,
  attachments,
  uploadingFiles,
  onRemoveContentGif,
  onRemoveAttachment,
  onVideoPreviewClick,
  formatFileSize
}) => {
  // Don't render if no attachments
  if (selectedContentGifUrls.length === 0 && attachments.length === 0 && uploadingFiles.size === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex space-x-3 overflow-x-auto w-full py-2 scrollbar-none scroll-smooth">
        {/* 1. Content GIFs (from selectedContentGifUrls) */}
        {selectedContentGifUrls.map((url, idx) => {
          // Convert Giphy page URLs to direct media URLs
          let displayUrl = url;
          if (url.includes('giphy.com/gifs/')) {
            const gifId = url.split('-').pop();
            if (gifId) {
              displayUrl = `https://media.giphy.com/media/${gifId}/giphy.gif`;
            }
          }
          
          return (
            <div key={`content-gif-${idx}`} className="relative w-[210px] min-w-[210px] h-[210px] rounded-lg border bg-white dark:bg-gray-800 shadow-sm group overflow-hidden flex-shrink-0">
              <img 
                src={displayUrl} 
                alt={`Selected GIF ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjEwIiBoZWlnaHQ9IjIxMCIgdmlld0JveD0iMCAwIDIxMCAyMTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMTAiIGhlaWdodD0iMjEwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik05MCA3NUMxMDcuNjczIDc1IDEyMiA4OS4zMjcgMTIyIDEwN0MxMjIgMTI0LjY3MyAxMDcuNjczIDEzOSA5MCAxMzlDNzIuMzI3IDEzOSA1OCAxMjQuNjczIDU4IDEwN0M1OCA4OS4zMjcgNzIuMzI3IDc1IDkwIDc1WiIgZmlsbD0iIzlCOUI5QiIvPgo8cGF0aCBkPSJNODQgOTNIMTAyVjEyMUg4NFY5M1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMzUgNzVIMTUyVjEzOUgxMzVWNzVaIiBmaWxsPSIjOUI5QjlCIi8+PC9zdmc+';
                }}
              />
              <button
                onClick={() => onRemoveContentGif(idx)} 
                className="absolute top-1.5 right-1.5 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-opacity z-10"
                aria-label={`Remove GIF ${idx + 1}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          );
        })}

        {/* 2. Other Attachments (from useAttachments) */}
        {attachments.map((att) => (
          <div key={att.id} className="relative w-[210px] min-w-[210px] h-[210px] rounded-lg border bg-white dark:bg-gray-800 shadow-sm group overflow-hidden flex-shrink-0">
            {/* Upload Error State */}
            {att.type === 'file' && !att.url && (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <div className="w-12 h-12 text-red-500 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Upload failed</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{att.name}</p>
              </div>
            )}
            
            {/* Type: Uploaded Image (including GIFs) */}
            {att.type === 'file' && att.fileType?.startsWith('image/') && att.url && (
              <img src={att.url} alt={att.name || 'Image attachment'} className="w-full h-full object-cover" />
            )}

            {/* Type: YouTube Video */}
            {att.type === 'video' && att.videoPlatform === 'youtube' && att.videoId && (
              <>
                <img src={`https://img.youtube.com/vi/${att.videoId}/hqdefault.jpg`} alt={att.name || 'YouTube thumbnail'} className="w-full h-full object-cover" />
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors cursor-pointer"
                  onClick={(e) => onVideoPreviewClick(e, att)}
                >
                  <div className="bg-black/70 text-white rounded-full p-3 text-2xl group-hover:scale-110 transition-transform">
                    <span>▶️</span>
                  </div>
                </div>
              </>
            )}
            
            {/* Type: Other Video (Non-YouTube) - Icon based */}
            {att.type === 'video' && att.videoPlatform !== 'youtube' && (
              <div className="p-3 flex flex-col items-center justify-center h-full text-center">
                <VideoIcon className="w-12 h-12 text-blue-500 dark:text-blue-400 mb-2" strokeWidth={1.5}/>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full" title={att.name}>{att.name || 'Video File'}</p>
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors cursor-pointer"
                  onClick={(e) => onVideoPreviewClick(e, att)}
                >
                  <div className="bg-black/70 text-white rounded-full p-3 text-2xl group-hover:scale-110 transition-transform">
                    <span>▶️</span>
                  </div>
                </div>
              </div>
            )}

            {/* Type: PDF */}
            {att.type === 'file' && att.fileType === 'application/pdf' && (
              <div className="p-3 flex flex-col items-center justify-center h-full text-center">
                <FileText className="w-12 h-12 text-red-500 dark:text-red-400 mb-2" strokeWidth={1.5}/>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full" title={att.name}>{att.name}</p>
                <p className="text-xxs text-gray-500 dark:text-gray-400">PDF · {formatFileSize(att.fileSize)}</p>
              </div>
            )}

            {/* Type: Link */}
            {att.type === 'link' && (
               <div className="p-3 flex flex-col items-center justify-center h-full text-center">
                <LinkIcon className="w-12 h-12 text-teal-500 dark:text-teal-400 mb-2" strokeWidth={1.5}/>
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate w-full hover:underline" title={att.url}>{att.name || att.url}</a>
              </div>
            )}

            {/* Type: Generic File (non-image, non-PDF) */}
            {att.type === 'file' && !att.fileType?.startsWith('image/') && att.fileType !== 'application/pdf' && (
              <div className="p-3 flex flex-col items-center justify-center h-full text-center">
                <File className="w-12 h-12 text-gray-500 dark:text-gray-400 mb-2" strokeWidth={1.5}/>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full" title={att.name}>{att.name}</p>
                <p className="text-xxs text-gray-500 dark:text-gray-400">{(att.fileType?.split('/')[1] || 'File').toUpperCase()} · {formatFileSize(att.fileSize)}</p>
              </div>
            )}
            
            {/* Universal Remove Button for attachments from useAttachments */}
            {! (att.type === 'file' && att.fileType?.startsWith('image/')) && /* Show only if not a full-card image preview */
             !(att.type === 'video' && att.videoPlatform === 'youtube') && /* Or not a YT video with its own overlay */
              att.type !== 'video' && /* And not other videos which have overlay */
              <button
                onClick={() => onRemoveAttachment(att.id)}
                className="absolute top-1.5 right-1.5 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-opacity z-10"
                aria-label={`Remove ${att.name || 'attachment'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            }
             {/* Remove button specifically for full-card image/video previews (where the above doesn't show) */}
            {( (att.type === 'file' && att.fileType?.startsWith('image/')) || 
              (att.type === 'video' && att.videoPlatform === 'youtube')) && (
               <button 
                onClick={() => onRemoveAttachment(att.id)} 
                className="absolute top-1.5 right-1.5 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-opacity z-10 opacity-0 group-hover:opacity-100"
                aria-label={`Remove ${att.name || 'attachment'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            )}
          </div>
        ))}
        
        {/* Upload Progress Indicators */}
        {Array.from(uploadingFiles.entries()).map(([fileId, progress]) => (
          <UploadProgressIndicator key={`uploading-${fileId}`} fileId={fileId} progress={progress} />
        ))}
      </div>
    </div>
  );
}; 