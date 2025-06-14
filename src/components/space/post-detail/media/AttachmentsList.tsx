import React from 'react';
import { Download } from 'lucide-react';
import { getFileIcon } from '@/shared/utils/file-utils';
import { formatFileSize, isImageUrl } from '@/shared/utils/file-utils';
import type { Attachment } from '@/features/posts/types';

interface AttachmentsListProps {
  attachments: Attachment[];
}

/**
 * Component for displaying non-video attachments (images, files, links)
 */
export default function AttachmentsList({ attachments }: AttachmentsListProps) {
  // Separate images from other files & links for different rendering
  const imageAttachments = attachments.filter(att => 
    att.type === 'file' && (att.fileType?.startsWith('image/') || isImageUrl(att.url))
  );
  
  const otherAttachments = attachments.filter(att => 
    (att.type === 'file' && !att.fileType?.startsWith('image/') && !isImageUrl(att.url)) || 
    att.type === 'link'
  );

  return (
    <div className="space-y-4 mb-6">
      {/* Images */}
      {imageAttachments.length > 0 && (
        <div className="space-y-3">
          {imageAttachments.map(att => (
            <div key={att.id} className="rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
              <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                <img 
                  src={att.url} 
                  alt={att.name || "Attached image"} 
                  className="w-full max-h-[500px] object-contain bg-gray-50"
                  loading="lazy"
                />
                
                {/* Optional caption/name for the image */}
                {att.name && att.name !== att.url && (
                  <div className="px-3 py-2 text-sm text-gray-700 border-t border-gray-100">
                    {att.name}
                  </div>
                )}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Other files & links */}
      {otherAttachments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {otherAttachments.map(att => (
            <div 
              key={att.id} 
              className="rounded-md bg-gray-50 border border-gray-200 p-3 hover:bg-gray-100 transition-colors"
            >
              <a 
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center group"
              >
                {getFileIcon(att.fileType, att.type)}
                <div className="flex-grow min-w-0">
                  <span 
                    className="font-medium text-sm text-blue-600 group-hover:text-blue-700 transition-colors truncate block" 
                    title={att.name || att.url}
                  >
                    {att.name || att.url}
                  </span>
                  {att.type === 'file' && att.fileSize && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatFileSize(att.fileSize)}
                    </div>
                  )}
                </div>
                <div className="ml-3 p-1.5 rounded-full bg-gray-200 group-hover:bg-gray-300 transition-colors flex-shrink-0">
                  <Download className="h-4 w-4 text-gray-600 group-hover:text-gray-700" />
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 