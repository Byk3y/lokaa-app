import React from 'react';
import { X, PlayCircle } from 'lucide-react';
import { Attachment } from '../../types';
import { isImageUrl, formatFileSize, getFileIcon } from '../../utils';

interface AttachmentItemProps {
  attachment: Attachment;
  onRemove: (id: string) => void;
  onVideoClick?: (e: React.MouseEvent<HTMLDivElement>, attachment: Attachment) => void;
}

/**
 * Component for displaying a single attachment (image, video, file, or link)
 */
export const AttachmentItem: React.FC<AttachmentItemProps> = ({
  attachment,
  onRemove,
  onVideoClick
}) => {
  const { id, type, url, name, fileType, fileSize, thumbnailUrl } = attachment;

  // Handle image attachments
  if (type === 'file' && (fileType?.startsWith('image/') || isImageUrl(url))) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-gray-200">
        <img 
          src={url} 
          alt={name || "Attached image"} 
          className="w-full max-h-72 object-contain"
        />
        <button
          onClick={() => onRemove(id)}
          className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-colors"
          aria-label="Remove attachment"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
    );
  }

  // Handle video attachments
  if (type === 'video') {
    return (
      <div className="relative rounded-lg overflow-hidden border border-gray-200 group">
        {/* Video Thumbnail with play button */}
        <div 
          className="relative aspect-video w-full bg-black cursor-pointer"
          onClick={onVideoClick ? (e) => onVideoClick(e, attachment) : undefined}
        >
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt="Video thumbnail" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200"></div>
          )}
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-black bg-opacity-60 group-hover:bg-opacity-80 transition-opacity">
              <PlayCircle className="h-6 w-6 text-white" />
            </div>
          </div>
          
          {/* Remove Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black bg-opacity-60 hover:bg-opacity-70 text-white transition-colors"
            aria-label="Remove attachment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Handle files and links
  return (
    <div className="relative rounded-md bg-gray-50 border border-gray-200 p-3 hover:bg-gray-100 transition-colors">
      <div className="flex items-center">
        {getFileIcon(fileType, type)}
        <div className="flex-grow min-w-0">
          <span className="font-medium text-blue-600">{name || url}</span>
          {fileType && !fileType.startsWith('image/') && (
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <span className="truncate">{fileType}</span>
              {fileSize && <span className="ml-2">{formatFileSize(fileSize)}</span>}
            </div>
          )}
        </div>
        <button
          onClick={() => onRemove(id)}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors ml-3"
          aria-label="Remove attachment"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}; 